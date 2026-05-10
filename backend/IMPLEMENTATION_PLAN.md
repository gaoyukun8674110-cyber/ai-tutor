# AI Tutor Backend Master Plan

## Purpose
This is the only active backend planning file.
All backend spec and progress documents have been consolidated into this file.

## Current Status
- Status: backend remediation and Tutor platform scope from 2026-04-29 through 2026-05-08 is complete.
- Mandatory backend backlog from the archived planning set: none.
- Verification gap carried from archived notes: local `ruff` and `mypy` execution was not completed in the constrained environment, even though config and CI support were added.

## Backend Responsibilities
- Own provider configuration, prompt profiles, and LLM API calls.
- Persist Tutor conversation history, summaries, and context handoff.
- Ingest study materials, generate embeddings, and serve filtered retrieval.
- Expose public error contracts, auth boundaries, and baseline security headers.

## Consolidated Delivery Scope

### 1. Tutor Chat Platform
- Added provider configuration, safe provider metadata, prompt-profile metadata, and OpenAI-compatible chat orchestration.
- Exposed `GET /api/llm/providers`, `GET /api/llm/prompt-profiles`, and `POST /api/llm/chat`.
- Moved `LLMService` to an application-scoped lifecycle and added provider-client reuse guards.
- Added sanitized API error responses and trace IDs for public-facing failures.

### 2. Conversation History and Context Control
- Added persistent Tutor conversation and message storage.
- Added conversation list, detail, and delete APIs under `/api/llm/conversations`.
- Extended chat requests and responses to support `conversation_id`.
- Implemented a context-window policy:
  - 0-10 exchanges: normal conversation.
  - 10-15 exchanges: frontend warning threshold.
  - 15+ exchanges: backend summary generation and compact context mode.
- Persisted Tutor summaries and compacted later model calls to summary plus recent exchanges plus current input.

### 3. Three-Stage Learning Method
- Added the `three_stage` Tutor profile as the default learning strategy.
- Added backend phase detection for planning, understanding, Feynman check, and general support.
- Returned `learning_phase` metadata from chat responses.
- Preserved learning-state details inside long-conversation summaries so later sessions keep useful educational context.

### 4. Materials, Upload Safety, and Retrieval
- Added upload size and file-signature validation before unbounded reads.
- Changed material ingestion to create pending records first and fill embeddings asynchronously.
- Exposed `embedding_mode` in material payloads and retrieval responses.
- Added baseline FastAPI security headers.
- Replaced recent-record RAG candidate scanning with a persistent VP-tree vector index.
- Preserved user scoping and `material_ids` filtering on indexed retrieval.

### 5. Validation Baseline
- Backend run: `python start.py`
- Backend tests: `python -m unittest discover -s tests -v`
- Backend import validation: `python -m compileall app tests`
- Focused regression suites from the archived work covered:
  - provider metadata and Tutor chat behavior,
  - conversation persistence and compact context,
  - auth, CORS, upload validation, and public error schema,
  - indexed material retrieval and provider-client reuse.

## Remaining Backend Follow-Up
- No mandatory backend implementation item remains open from the archived planning set.
- When local tooling is available, run `ruff` and `mypy` against the configured backend environment to close the remaining verification gap.

## Consolidated Sources
The following backend planning documents were consolidated into this file and then removed to avoid duplicate planning inputs:
- `backend/PROGRESS.md`
- `backend/specs/ai-tutor-chat.md`
- `backend/specs/tutor-conversation-history.md`
- `backend/specs/tutor-context-window.md`
- `backend/specs/three-stage-learning.md`
- `backend/specs/p1-audit-remediation.md`
