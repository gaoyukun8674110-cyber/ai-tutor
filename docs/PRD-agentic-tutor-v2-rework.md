# PRD｜AI-Tutor Agent 化 v2 · 返工补全（M4/M5 + 编排接线）

- 状态：Draft，返工任务，交 codex 补完
- 依据：主 PRD `docs/PRD-agentic-tutor-v2.md`（不重复其设计，仅补它未完成部分）
- 基线：分支 `feat/agentic-tutor-v2-m1-m3`，commit `062c0ea`（M1–M3 已入库、106 测试全绿）
- 日期：2026-07

---

## 0. 为什么有这份文档

codex 上一轮交付了 M1–M3 的地基（Agent 契约、BKT 学习者模型、TeachingPolicy），**质量合格且已提交**。但 **M4（主动复盘）、M5（web-search）未做**，且多个 Agent 建了空壳没接线。本文件把**剩余四块**拆成可独立验收的返工任务。**不要重写 M1–M3，只补缺口。**

### 已核实的现状（codex 必读，别再重复造）
- `agents/base.py`：`AgentContext` **已有 `student_id` 字段**（当前被传成 `None`，见 R1）；`AgentResult`、`BaseAgent` 契约完整。
- `agents/tools/registry.py`：`ToolRegistry` **已支持 `register/get/has`**，但**没注册任何工具**。
- `agents/orchestrator.py`：`run_chat` **只调用了 `tutor`**；`diagnostician/grader/planner/reviewer` 已实例化但从未被调用。
- `agents/{diagnostician,grader,planner,reviewer}.py`：都是**可用的薄封装**，逻辑正确，只是没人调它们。
- `services/knowledge_tracing.py`：BKT 完成，勿动。
- `config.py`：BKT_* 全部就位，`REVIEW_MASTERY_THRESHOLD=0.55` 已加；**web-search 配置项全缺**。
- `services/`：**无 `review_scheduler.py`**；**无 `agents/tools/{web_search,retriever,learner_store,math}.py`**。

---

## 1. 返工任务总览

| ID | 任务 | 对应主 PRD | 优先级 |
|---|---|---|---|
| **R1** | `student_id` 透传 + 学习者模型注入对话链路 | §4 黑板 | P0（命脉，最先做） |
| **R2** | 工具层落地：`retriever` / `math` / `learner_store` / `web_search` | §3.1、§4.1 | P0 |
| **R3** | M4：主动复盘 + 调度（`review_scheduler` + Reviewer 实体化 + API） | §8、§10 | P1 |
| **R4** | M5：Tavily web-search 受控触发 + 归一化注入 | §9 | P1 |

R1、R2 是 R3/R4 的地基，**必须先做**。顺序：R1 → R2 → R3 → R4，各自独立提交、独立回归。

---

## R1 — student_id 透传（P0，命脉）

**问题**：`orchestrator.run_chat` 里 `student_id=None`（`orchestrator.py:45`）。学习者模型是整个设计的心脏，但对话链路根本没把它接进去，Tutor 读不到掌握度/学习风格，"自适应"名不副实。

**要做**：
1. `orchestrator.run_chat` 增加参数 `student_id: int | None`，写进 `AgentContext.student_id`。
2. `api/llm.py::tutor_chat`：调 `orchestrator.run_chat` 前，用 `StudentModelService(db).get_or_create_student(current_user.username)` 拿到 `student.id` 传入（复用现有 service，勿新建）。
3. Tutor 运行时，通过 `learner_store` 工具（见 R2）读取该学生的 `learner_snapshot`（掌握度弱项 top-k + `learner_profiles` 的学习风格），注入 `tutor_context`，供 `_build_system_prompt` 使用。
4. `learner_profiles` 无记录时返回空快照，不报错（冷启动兼容）。

**验收**：
- 单测：给定已有掌握度的 student，`run_chat` 后 `tutor_context` 含非空 `learner_snapshot`。
- 现有 106 测试仍全绿；`/api/llm/chat` 契约不破坏（新增字段只读回传）。

---

## R2 — 工具层落地（P0）

**问题**：`ToolRegistry` 是空的；主 PRD §4.1 要求的 4 个工具一个都没实现。Tutor 的 `allowed_tools=["retriever","learner_store"]` 引用了不存在的工具。

**要做**：在 `agents/tools/` 下新建，每个都是对**现有 service 的薄封装**，不重写业务逻辑：

| 文件 | 封装 | 关键方法 |
|---|---|---|
| `retriever.py` | `MaterialService` | `search(query, user_id, material_ids, top_k) -> list[chunk]` |
| `math.py` | `MathTools` | `verify(student, correct) -> dict` |
| `learner_store.py` | `StudentModelService` + `KnowledgeTracingService` | `snapshot(student_id) -> dict`（弱项+画像）、`weak_skills(student_id, k)` |
| `web_search.py` | Tavily（见 R4） | `search(query) -> list[chunk]`（R4 落地，R2 先留接口占位） |

- 在应用启动（`get_orchestrator` 或 bootstrap）时把工具 `register` 进 `ToolRegistry`，Orchestrator 持有。
- 工具调用**全部确定性代码触发**，不依赖模型 function-calling（主 PRD §12 风险）。

**验收**：
- `ToolRegistry.has("retriever"/"math"/"learner_store"/"web_search")` 全为真。
- 单测：每个工具能被 registry 取出并调用其封装的 service（可 mock service）。

---

## R3 — M4 主动复盘 + 调度（P1）

**问题**：主 PRD §8 完全没做。`ReviewerAgent` 只是把 payload 原样塞回的空壳；无调度、无 API、无 `review_reports` 落库逻辑（表已在迁移里建好）。

**要做**：

### R3.1 Reviewer 实体化
`agents/reviewer.py`：实现真实复盘逻辑——读 `learner_store` 拿全量掌握度 + 遗忘衰减后的 `effective_mastery`，用 LLM（复用 `llm.complete_chat`，`prompt_profile="coach"` 或自定义）生成结构化复盘报告，写入 `review_reports`（`student_id` / `period` / `report`(JSON) / `created_at` / `acknowledged=false`）。

### R3.2 调度器
新建 `services/review_scheduler.py`，用 **APScheduler**（加入 `requirements.txt`）：
- **触发条件（满足其一）**：某知识点 `effective_mastery < REVIEW_MASTERY_THRESHOLD`（config 已有）；连续答错累计超阈值；距上次复盘 ≥ 7 天（兜底）。
- **主动性有闸**：读 `learner_profiles.review_enabled` / `review_frequency`；关闭则跳过。
- 调度器在应用 startup 挂载（`main.py` lifespan），单 VPS 单进程即可，勿引入额外 broker。
- **不打断进行中的训练**：仅生成报告落库，推送留给前端拉取。

### R3.3 API（`api/` 下新增 router，注册到 `main.py`）
- `GET /api/review/reports`：拉当前用户的 `review_reports`。
- `POST /api/review/run`：手动触发一次复盘（调度之外的入口，便于测试）。
- `POST /api/review/reports/{id}/ack`：标记 `acknowledged`。
- 复用 `get_current_user` 鉴权，user 维度隔离（照 `training.py::_require_session` 的所有权校验写法）。

### R3.4 Planner 接线
`PlannerAgent` 已能吐 `target_skills`；让 `POST /api/training/sessions` 在 `target_skills` 为空时，用最近一次 `review_reports` / `learner_store.weak_skills` 填充，并标注来源（薄弱/复习/新学）。

**验收**：
- 单测：构造"某知识点低于阈值"的 student，`review/run` 后 `review_reports` 新增一条且含弱项。
- `review_enabled=false` 时调度不产报告。
- `GET /api/review/reports` 只返回本人数据（跨用户隔离测试）。
- APScheduler 挂载不阻塞 startup；测试环境可用 `E2E_MOCK_LLM` 跳过真实 LLM。

---

## R4 — M5 Tavily web-search（P1）

**问题**：主 PRD §9 完全没做。`web_search.py` 不存在；Tutor 里 `web_search_used` 永远写死 `False`。

**要做**（严格照主 PRD §9，此处只列落地要点）：

### R4.1 config 新增（`config.py`，当前全缺）
```python
WEB_SEARCH_PROVIDER: str = "tavily"
WEB_SEARCH_API_KEY: str | None = None
WEB_SEARCH_PROXY: str | None = None      # VPS(新加坡)留空直连；本机 dev 才填 socks5://127.0.0.1:10808
WEB_SEARCH_MAX_RESULTS: int = 3
WEB_SEARCH_TIMEOUT: float = 8.0
RAG_MIN_SCORE: float = 0.35
```
同步更新 `.env.example`。

### R4.2 `agents/tools/web_search.py`
- `WebSearchProvider` Protocol + `TavilyProvider`（httpx；`WEB_SEARCH_PROXY` 为空时直连，非空才挂 SOCKS5）。
- **归一化成 RAG 同款 chunk**：`{content, source_label, url, score, origin:"web"}`——复用 `_inject_material_context` / `_format_material_context` 注入路径，不另建展示通道。
- 15 分钟 TTL 缓存；超时/条数上限/正文截断；失败**静默降级**为"当前无法联网核实，以下基于通用知识"，绝不硬编内容。
- 埋点 `agent_type="tool:web_search"`（复用 `AnalyticsService`）。

### R4.3 触发闸门（确定性，写在 `api/llm.py` 的检索路由处，接在现有 RAG 注入之后）
命中其一才触发，**函数化便于单测**：
1. 用户显式要求联网（消息含"联网/搜一下/查一下最新"等）
2. Grader/事实存疑标记
3. 时效性关键词（最新/今年/版本/赛事/新闻…）
4. RAG 命中为空 或 最高分 `< RAG_MIN_SCORE`

**明确不做**：学生答错就自动联网。

### R4.4 回传
Tutor/chat 结果里 `web_search_used`、`used_tools` 如实反映（不再写死 False）；前端可展示来源 URL。

**验收**：
- 单测（mock Tavily）：四类触发各命中一次；RAG 高分命中时**不**触发；失败时降级文案出现且不抛错。
- `WEB_SEARCH_PROXY` 空/非空两种配置都能构造 client。
- 连通性（人工，M5 收尾）：新加坡 VPS 直连 `api.tavily.com` 成功。

---

## 2. 全局约束（照 AGENTS.md）

- 后端每个任务收尾跑：`python -m compileall app tests` + `python -m unittest discover -s tests`（**需先启 pgvector**：`docker start ai-tutor-db-1`，DB 默认 `localhost:55432`）。
- 前端若涉及展示改动：`npm run type-check` / `lint` / `build`。
- **不改 M1–M3 已过测的实现**（BKT、TeachingPolicy、Agent 契约）；只新增与接线。
- API/DB 契约变更同一 commit；不提交本地库/上传件/venv/pyc。
- **每个 R 任务单独提交**，commit message 注明完成范围与验收结果。
- 新依赖（APScheduler、tavily/httpx）写进 `requirements.txt`。

## 3. 交付定义（Definition of Done）

- R1–R4 全部完成，`python -m unittest discover -s tests` 在 pgvector 启动下**全绿**（当前基线 106，返工后应 > 106）。
- `alembic upgrade head` 通过（迁移已存在，勿新增破坏性迁移）。
- Orchestrator 的五个专家 Agent 在对话/训练/复盘链路中**真实被调用**，不再有空壳。
- `web_search_used` / `learner_snapshot` / `review_reports` 三条数据在真实链路中可观测（非写死）。
- 在 PR 描述里逐条对照本文件 R1–R4 的验收项打勾，并记录 SSSAiCode 网关 function-calling 的验证结论。
</content>
