"""LLM 相关 API"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.services.llm_service import LLMService
from app.services.analytics import AnalyticsService
from app.services.chat_history import ChatHistoryService
from app.services.materials import MaterialService
from app.utils.errors import api_error, safe_llm_error

router = APIRouter(prefix="/api/llm", tags=["llm"], dependencies=[Depends(get_current_user)])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    provider: str = "auto"
    model: Optional[str] = None
    prompt_profile: str = "three_stage"
    system_prompt_override: Optional[str] = None
    messages: List[ChatMessage]
    tutor_context: Dict[str, Any] = Field(default_factory=dict)


class HintRequest(BaseModel):
    question_content: str
    student_answer: Optional[str] = None
    step: int = 1


class ExplainRequest(BaseModel):
    question_content: str
    standard_solution: str
    solution_steps: Optional[list] = None


class DiagnoseRequest(BaseModel):
    question_content: str
    student_answer: str
    correct_answer: str
    standard_solution: str


class SummaryRequest(BaseModel):
    session_stats: dict


def get_llm_service(request: Request) -> LLMService:
    llm_service = getattr(request.app.state, "llm_service", None)
    if llm_service is None:
        llm_service = LLMService()
        request.app.state.llm_service = llm_service
    return llm_service


def _last_user_message(messages: List[ChatMessage]) -> Optional[str]:
    for message in reversed(messages):
        if message.role == "user" and message.content.strip():
            return message.content.strip()
    return None


def _normalize_material_ids(raw_material_ids: Any) -> Optional[List[int]]:
    if raw_material_ids is None:
        return None
    if not isinstance(raw_material_ids, list):
        return []

    material_ids: List[int] = []
    for raw_id in raw_material_ids:
        try:
            material_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        if material_id > 0:
            material_ids.append(material_id)
    return material_ids


def _inject_material_context(
    tutor_context: Dict[str, Any],
    last_user_message: Optional[str],
    material_service: MaterialService,
    user_id: Optional[str],
    top_k: int,
) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
    next_context = dict(tutor_context)
    cleaned_message = (last_user_message or "").strip()
    if not cleaned_message:
        next_context.pop("material_context", None)
        return next_context, []

    selected_material_ids = _normalize_material_ids(next_context.get("material_ids"))
    if "material_ids" in next_context and not selected_material_ids:
        next_context.pop("material_context", None)
        return next_context, []

    chunks = material_service.search_materials(
        query=cleaned_message,
        user_id=user_id,
        material_ids=selected_material_ids,
        top_k=top_k,
    )
    if chunks:
        next_context["material_context"] = {"chunks": chunks}
    else:
        next_context.pop("material_context", None)
    return next_context, chunks


def _prepare_tutor_context(
    request: ChatRequest,
    llm: LLMService,
    material_service: MaterialService,
    user_id: str,
) -> tuple[Dict[str, Any], List[Dict[str, Any]], Optional[str], str]:
    last_user_message = _last_user_message(request.messages)
    tutor_context = dict(request.tutor_context)
    detected_learning_phase = llm.detect_learning_phase(last_user_message)
    previous_learning_phase = str(tutor_context.get("learning_phase") or "")
    learning_phase = previous_learning_phase if detected_learning_phase == "general" and previous_learning_phase else detected_learning_phase
    tutor_context["learning_phase"] = learning_phase

    retrieved_material_chunks: List[Dict[str, Any]] = []
    try:
        tutor_context, retrieved_material_chunks = _inject_material_context(
            tutor_context=tutor_context,
            last_user_message=last_user_message,
            material_service=material_service,
            user_id=user_id,
            top_k=settings.RAG_TOP_K,
        )
    except Exception:
        tutor_context["material_context_error"] = "Material search is temporarily unavailable"

    return tutor_context, retrieved_material_chunks, last_user_message, learning_phase


def _build_model_messages(
    request: ChatRequest,
    history: ChatHistoryService,
    last_user_message: Optional[str],
    user_id: str,
) -> tuple[List[Dict[str, Any]], str]:
    model_messages = [message.model_dump() for message in request.messages]
    context_policy = "full"
    if request.conversation_id is not None and last_user_message:
        compact_messages = history.build_model_messages(
            conversation_id=request.conversation_id,
            pending_user_message=last_user_message,
            user_id=user_id,
        )
        if compact_messages:
            return compact_messages, "summary_recent"
    return model_messages, context_policy


def _finalize_conversation_response(
    result: Dict[str, Any],
    request: ChatRequest,
    history: ChatHistoryService,
    llm: LLMService,
    tutor_context: Dict[str, Any],
    last_user_message: Optional[str],
    user_id: str,
    session_id: Optional[int],
    analytics: Optional[AnalyticsService] = None,
) -> Dict[str, Any]:
    assistant_message = result.get("message", {}).get("content")
    if not last_user_message or not assistant_message:
        return result

    try:
        conversation = history.save_exchange(
            conversation_id=request.conversation_id,
            user_message=last_user_message,
            assistant_message=assistant_message,
            prompt_profile=result.get("prompt_profile", request.prompt_profile),
            provider=result.get("provider", request.provider),
            model=result.get("model", request.model or ""),
            training_mode=str(tutor_context.get("mode") or "") or None,
            user_id=user_id,
            assistant_label="Tutor",
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    summary_generated = False
    if history.needs_summary(conversation["id"], conversation["message_count"]):
        detail = history.get_conversation(conversation["id"], user_id=user_id)
        if detail:
            fallback_summary = history.build_fallback_summary(detail["messages"])
            summary_request = request.model_copy(update={"tutor_context": tutor_context})
            summary = _generate_conversation_summary(
                llm=llm,
                request=summary_request,
                conversation=detail,
                fallback_summary=fallback_summary,
                user_id=user_id,
                session_id=session_id,
                analytics=analytics,
            )
            history.save_summary(
                conversation_id=conversation["id"],
                content=summary,
                source_message_count=conversation["message_count"],
                user_id=user_id,
            )
            conversation = history.get_conversation(conversation["id"], user_id=user_id) or conversation
            summary_generated = True

    conversation_detail = history.get_conversation(conversation["id"], user_id=user_id) or conversation
    result["conversation_id"] = conversation["id"]
    result["conversation"] = conversation_detail
    result["messages"] = conversation_detail.get("messages", [])
    result["exchange_count"] = conversation_detail.get("exchange_count")
    result["should_suggest_new_chat"] = conversation_detail.get("should_suggest_new_chat", False)
    result["should_start_new_chat"] = conversation_detail.get("should_start_new_chat", False)
    result["summary_generated"] = summary_generated
    return result


def _generate_conversation_summary(
    llm: LLMService,
    request: ChatRequest,
    conversation: Dict[str, Any],
    fallback_summary: str,
    user_id: Optional[str],
    session_id: Optional[int],
    analytics: Optional[AnalyticsService] = None,
) -> str:
    learning_phase = str(request.tutor_context.get("learning_phase") or "general")
    transcript = "\n".join(
        f"{message['role']}: {message['content']}"
        for message in conversation.get("messages", [])
        if message.get("role") in {"user", "assistant"}
    )
    summary_prompt = (
        "Summarize this AI Tutor learning conversation for the next session.\n"
        f"Current learning phase: {learning_phase}\n"
        "Keep these fields when present: learning goal, the key 20% knowledge points, understood concepts, "
        "stuck concepts, Feynman gaps, tutor hints already given, and next learning step.\n"
        "Do not repeat small talk or irrelevant content. Keep the summary under 300 Chinese characters or 180 English words.\n\n"
        f"Conversation transcript:\n{transcript}"
    )

    result = llm.chat(
        provider=request.provider,
        model=request.model,
        messages=[{"role": "user", "content": summary_prompt}],
        prompt_profile="custom",
        system_prompt_override="You summarize AI Tutor sessions. Output only reusable learning-state summary text.",
        tutor_context={"task": "conversation_summary", "learning_phase": learning_phase},
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )
    if "error" in result:
        return fallback_summary
    return result.get("message", {}).get("content") or fallback_summary


@router.get("/providers", response_model=dict)
def provider_metadata(
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """获取可用模型 Provider 元数据，不返回任何 API Key"""
    return llm.get_provider_metadata()


@router.get("/prompt-profiles", response_model=dict)
def prompt_profiles(
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """获取可用 Tutor 系统提示词配置"""
    return llm.get_prompt_profiles()


@router.get("/conversations", response_model=dict)
def conversation_history(
    user_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """List persisted Tutor conversations."""
    user_id = current_user
    history = ChatHistoryService(db)
    return {"conversations": history.list_conversations(user_id=user_id, limit=limit)}


@router.get("/conversations/search", response_model=dict)
def search_conversation_history(
    query: str,
    user_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Search persisted Tutor conversations by title, summary, and message text."""
    user_id = current_user
    history = ChatHistoryService(db)
    return {"conversations": history.search_conversations(query=query, user_id=user_id, limit=limit)}


@router.get("/conversations/{conversation_id}", response_model=dict)
def conversation_detail(
    conversation_id: int,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Load one persisted Tutor conversation with messages."""
    user_id = current_user
    history = ChatHistoryService(db)
    conversation = history.get_conversation(conversation_id, user_id=user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("/conversations/{conversation_id}/export", response_model=dict)
def export_conversation(
    conversation_id: int,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Export one Tutor conversation as Markdown content."""
    user_id = current_user
    history = ChatHistoryService(db)
    exported = history.export_conversation_markdown(conversation_id, user_id=user_id)
    if not exported:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return exported


@router.delete("/conversations/{conversation_id}", response_model=dict)
def delete_conversation(
    conversation_id: int,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    """Delete a persisted Tutor conversation."""
    user_id = current_user
    history = ChatHistoryService(db)
    deleted = history.delete_conversation(conversation_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"deleted": True}


@router.post("/chat", response_model=dict)
def tutor_chat(
    request: ChatRequest,
    user_id: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """统一 Tutor 对话入口，支持多 Provider 后端代理"""
    user_id = current_user
    analytics = AnalyticsService(db)
    history = ChatHistoryService(db)

    conversation_before = None
    if request.conversation_id is not None:
        conversation_before = history.get_conversation(request.conversation_id, user_id=user_id)
        if not conversation_before:
            raise HTTPException(status_code=404, detail="Conversation not found")

    tutor_context, retrieved_material_chunks, last_user_message, learning_phase = _prepare_tutor_context(
        request=request,
        llm=llm,
        material_service=MaterialService(db),
        user_id=user_id,
    )
    model_messages, context_policy = _build_model_messages(
        request=request,
        history=history,
        last_user_message=last_user_message,
        user_id=user_id,
    )

    result = llm.chat(
        provider=request.provider,
        model=request.model,
        messages=model_messages,
        prompt_profile=request.prompt_profile,
        system_prompt_override=request.system_prompt_override,
        tutor_context=tutor_context,
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )

    if "error" in result:
        detail = result["error"] if isinstance(result["error"], dict) else safe_llm_error(result["error"])
        raise HTTPException(status_code=502, detail=detail)

    result = _finalize_conversation_response(
        result=result,
        request=request,
        history=history,
        llm=llm,
        tutor_context=tutor_context,
        last_user_message=last_user_message,
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )

    result["context_policy"] = context_policy
    result["learning_phase"] = result.get("learning_phase", learning_phase)
    if retrieved_material_chunks:
        result["material_context"] = {"chunks": retrieved_material_chunks}

    return result


@router.post("/hint", response_model=dict)
def generate_hint(
    request: HintRequest,
    user_id: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """生成提示"""
    user_id = current_user
    analytics = AnalyticsService(db)
    
    result = llm.generate_hint(
        question_content=request.question_content,
        student_answer=request.student_answer,
        step=request.step,
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )
    
    if "error" in result:
        raise api_error(502, "llm_provider_error", "Model provider is temporarily unavailable")
    
    return result


@router.post("/explain", response_model=dict)
def explain_solution(
    request: ExplainRequest,
    user_id: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """讲解标准解"""
    user_id = current_user
    analytics = AnalyticsService(db)
    
    result = llm.explain_solution(
        question_content=request.question_content,
        standard_solution=request.standard_solution,
        solution_steps=request.solution_steps,
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )
    
    if "error" in result:
        raise api_error(502, "llm_provider_error", "Model provider is temporarily unavailable")
    
    return result


@router.post("/diagnose", response_model=dict)
def diagnose_error(
    request: DiagnoseRequest,
    user_id: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """诊断错误"""
    user_id = current_user
    analytics = AnalyticsService(db)
    
    result = llm.diagnose_error(
        question_content=request.question_content,
        student_answer=request.student_answer,
        correct_answer=request.correct_answer,
        standard_solution=request.standard_solution,
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )
    
    if "error" in result:
        raise api_error(502, "llm_provider_error", "Model provider is temporarily unavailable")
    
    return result


@router.post("/summary", response_model=dict)
def session_summary(
    request: SummaryRequest,
    user_id: Optional[str] = None,
    session_id: Optional[int] = None,
    db: Session = Depends(get_db),
    llm: LLMService = Depends(get_llm_service),
    current_user: str = Depends(get_current_user),
):
    """生成 Session 总结"""
    user_id = current_user
    analytics = AnalyticsService(db)
    
    result = llm.session_summary(
        session_stats=request.session_stats,
        user_id=user_id,
        session_id=session_id,
        analytics=analytics,
    )
    
    if "error" in result:
        raise api_error(502, "llm_provider_error", "Model provider is temporarily unavailable")
    
    return result

