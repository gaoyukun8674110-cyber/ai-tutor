# PRD｜AI-Tutor Agent 化 v2（自适应多 Agent 训练系统）

- 状态：Draft，待 codex 开工
- 作者：产品 + Claude（架构对齐）
- 日期：2026-07
- 关联：`docs/PRD-rag-pgvector-migration.md`、`backend/app/services/{llm_service,student_model,training_engine}.py`

---

## 0. 一句话目标

把现在"靠 system-prompt 切换角色、单端点问答"的 Tutor，升级为**以学习者模型为中心的多 Agent 自适应训练系统**：实时识别思维卡点、主动周期性复盘、按薄弱点主动出专项题、按需联网查证。

---

## 1. 背景与现状（codex 必读）

现有实现的真实状态：

- **"多角色"只是 prompt**：`LLMService.agent_prompts`（solver/tutor/diagnosis/pomodoro_coach）+ `prompt_profiles`（three_stage/socratic/explain/diagnose/coach/exam/custom），全部经 `POST /api/llm/chat` 走同一条链路。没有编排、没有 agent 间协作、没有工具调用。
- **学生模型是启发式**：`StudentModelService._calculate_mastery_score` 用手写增减分；代码注释已标注"可后续升级为 BKT/DKT"。表：`student_masteries`。
- **训练引擎是规则调度**：`TrainingEngine._decide_strategy` 用"连对/连错 3 题→升降难度"。
- **知识点结构**：`question_skills`（题→知识点）、`prerequisite_skills`（题→先修点）存在，但**没有独立的知识点表，也没有知识点→知识点的依赖图**。
- **RAG**：pgvector，`MaterialService.search_materials` 已在 `/api/llm/chat` 经 `_inject_material_context` 注入 `material_context.chunks`。
- **无 Web Search**。
- **无调度/主动任务**：一切用户触发。
- **模型网关**：OpenAI-compatible，聊天强制走 SSSAiCode（LinkAPI）代理 Claude、强制 stream；embedding 走 OpenAI 官方。
- **部署出口**：生产 VPS 在**新加坡，外网直连、无需代理**；SOCKS5 `127.0.0.1:10808` 仅本机 dev 环境需要（gh/git）。

**原则：进化，不重写。** 复用上述资产，逐步抽出 Agent 抽象。

---

## 2. 范围

**In scope（v2）**
- Orchestrator + 5 个专家 Agent 抽象层
- 学习者模型升级：BKT + 遗忘衰减；独立知识点表与依赖图
- Tutor 自适应教学策略层（按错因/画像自动选策略）
- 主动周期性复盘（调度任务）
- Web Search 工具（Tavily，受控触发）+ 与 RAG 的检索路由

**Out of scope（记录为未来项）**
- DKT/SAKT 等深度知识追踪
- 模型原生 function-calling 自主决策（v2 用确定性工具路由）
- 全自治 multi-agent handoff

---

## 3. Agent 设计（对应 Q1）

**1 编排器 + 5 专家 + 1 共享工具层。** 每个 Agent = 明确的 system prompt + 允许的工具 + 结构化 I/O 契约。

| # | Agent | 职责 | 输入 → 输出 | 复用 |
|---|---|---|---|---|
| 0 | **Orchestrator** 编排器 | 控制器，**以确定性代码为主**；意图分类 + 状态机路由 + 维护会话/训练状态 | 用户消息/系统事件 → 分派 + 上下文 | 吸收 `training_engine` 调度 |
| 1 | **Diagnostician** 诊断 | 实时识别卡点、错因分类、写学生模型 | 答题/对话 → `error_type` + 掌握度更新 | `diagnose_error`、`student_model` |
| 2 | **Tutor** 授课 | 自适应教学（见 §5） | 卡点 + 画像 → 讲解/追问/提示 | 7 个 `prompt_profiles` 当策略池 |
| 3 | **Planner** 规划 | 排下一次 session 目标点/难度/专项题 | 学生模型 + 遗忘曲线 → session plan | `get_recommended_skills`、`_generate_session_plan` |
| 4 | **Reviewer** 复盘 | **主动**周期复盘、生成报告、回写画像/学习风格 | 历史数据 → 报告 + 计划调整 | `get_learning_report` |
| 5 | **Grader** 判题 | 判题、数学校验（事实锚点） | 答案 → 对错 + 校验 | `math_tools`、`_judge_answer` |

**工具层（shared tools，非 agent）**：`retriever`（RAG）、`web_search`（Tavily）、`math`（sympy）、`student_model`（读写画像）。

### 3.1 Agent 契约（统一基类）
新建 `backend/app/agents/base.py`：

```python
class AgentContext:  # 传入每个 agent 的上下文
    user_id: str
    student_id: int
    session_id: int | None
    learner_snapshot: dict      # 学生模型快照（掌握度、学习风格、近期表现）
    signals: dict               # 实时信号（用时、hint 次数、连错、疲劳、置信度）
    tools: ToolRegistry         # 允许调用的工具

class BaseAgent:
    name: str
    allowed_tools: list[str]
    def run(self, ctx: AgentContext, payload: dict) -> AgentResult: ...
```

`AgentResult` 至少含：`content`（给学生的文本）、`state_updates`（回写黑板的结构化数据）、`used_tools`、`agent_type`（沿用现有 analytics 的 `agent_type` 埋点）。

---

## 4. 系统架构（对应 Q2）

**Orchestrator-Worker（主管-专家）+ 共享黑板（学习者模型）+ 工具层。**

```
┌─────────── Orchestrator（确定性状态机 + 轻量意图分类）───────────┐
│   diagnose → teach → practice → review 的骨架路由              │
└───┬──────────┬───────────┬───────────┬───────────┬───────────┘
    ▼          ▼           ▼           ▼           ▼
Diagnostician Tutor      Planner     Reviewer    Grader     ← 专家 Agent（LLM + 受限工具）
    └──────────┴───────────┴───────────┴───────────┘
                      读写 ▲▼
        ┌──────── 黑板：学习者模型（Postgres）────────┐
        │ student_masteries(+BKT) / learner_profiles  │
        │ / skills / skill_edges / review_reports      │
        └──────────────────────────────────────────────┘
                      调用 ▲▼
        工具层：retriever(RAG) · web_search(Tavily) · math · student_model
```

**设计决策与理由**
- **确定性编排**：tutoring 流程可预测，代码状态机比 LLM 自主 handoff 更可靠/省钱/可评测。
- **交互同步，重活异步**：交互轮走"路由 + 单次定向 LLM 调用"保证秒回；周期复盘走 **APScheduler** 异步任务（单 VPS 够用）。
- **学习者模型是黑板**：所有 agent 读写同一份画像，是把功能粘成整体的关键。
- **工具确定性触发**：⚠️ SSSAiCode 网关是否透传 function-calling 未知，**v2 工具路由用代码触发，不依赖模型原生 tool-calls**（见 §9、§12 风险）。

### 4.1 目录结构（新增）
```
backend/app/agents/
  base.py           # BaseAgent / AgentContext / AgentResult
  orchestrator.py   # 状态机 + 意图分类 + 路由
  diagnostician.py
  tutor.py          # 含 teaching policy
  planner.py
  reviewer.py
  grader.py
  tools/
    registry.py
    retriever.py    # 包装 MaterialService（RAG）
    web_search.py   # 新增（Tavily）
    math.py         # 包装 MathTools
    learner_store.py# 包装 StudentModelService（读写）
backend/app/services/knowledge_tracing.py  # BKT + 遗忘衰减
backend/app/services/review_scheduler.py    # 主动复盘调度
```

---

## 5. Tutor 自适应教学策略（对应 Q3）

Tutor **不锁定苏格拉底**。新增 `TeachingPolicy`：每轮按诊断信号 + 学习风格**自动选策略**（现有 `prompt_profiles` 变成策略菜单，不再让用户手动选）。

| 诊断信号（来自 Diagnostician） | 自动策略 |
|---|---|
| 概念误解 `concept_error` | `explain` / 类比 / 费曼 |
| 方法/思路错 `method_error` | `socratic` 追问 |
| 计算错 `calculation_error` | 定位 + 让学生自己重算（轻提示） |
| 审题错 `reading_error`（新增错因） | 引导重读题干 |
| 连错/疲劳 | `coach` 降难度 + 鼓励 |
| 考前模式 | `exam` 限时 |

- 学习风格字段（偏例子/偏抽象、节奏 pace、详略 verbosity）存入 `learner_profiles`，由 **Reviewer 长期推断并回写**，Tutor 每轮读取拼进 system prompt。
- 复用 `LLMService._build_system_prompt` 的 `tutor_context` 注入通道，把 policy 选择结果作为上下文传入。
- **策略 id 与 eval 用例见 [附录 A](#附录-a教学策略-teachingpolicy-eval-用例)**——codex 按附录实现 `TeachingPolicy.select(...)` 并让附录的用例全绿，避免"错因→策略"映射跑偏。

---

## 6. 学习者模型升级（对应 Q4）

**BKT（贝叶斯知识追踪）+ 遗忘衰减。不做 DKT。**

理由（决策记录）：数据量小 → DKT 过拟合；BKT 可解释（诊断/复盘要能讲清"为什么弱"）；在线增量、零训练管线、贴合 VPS+Postgres；`_calculate_mastery_score` 钩子可干净替换。DKT/SAKT 列为未来项。

### 6.1 BKT 实现
`backend/app/services/knowledge_tracing.py`：标准 4 参数
- `p_L0` 初始掌握先验、`p_T` 学会率、`p_S` 失误率、`p_G` 猜对率
- 每答一题在线更新 `P(known)`（贝叶斯后验 + 转移）
- v2 用**全局默认参数**（可配），后续再按知识点/学生个性化（BKT+）

### 6.2 遗忘衰减（必须）
- 在 `P(known)` 上叠加时间半衰期：`P_eff = P(known) * exp(-Δt / half_life)`
- `half_life` 随掌握度提升而变长；驱动"该复习了"的判定，支撑 §8 主动复盘 + 间隔重复。

### 6.3 兼容
- 保留 `student_masteries` 现有列；`mastery_score` 改由 BKT 的 `P_eff` 写入，旧启发式作为 fallback（无 BKT 参数时）。
- `StudentModelService.update_mastery_from_answer` 内部改调 `knowledge_tracing`，对外接口不变（`training_engine`、API 无需改）。

---

## 7. 数据模型变更（Alembic 迁移）

新增迁移 `backend/alembic/versions/2026xxxx_agentic_v2.py`：

1. **`skills`（独立知识点表）**：`skill_id`(PK, str)、`name`、`chapter`、`description`。把散落在 `question_skills.skill_name` 的知识点收敛为主数据。
2. **`skill_edges`（知识点依赖图）**：`from_skill_id`、`to_skill_id`、`relation`（`prerequisite`/`related`）。支撑"卡在 A 其实是 B 没掌握"的回溯。用 `prerequisite_skills` 数据回填。
3. **`student_masteries` 扩列**：`bkt_p_known`(Float)、`bkt_half_life`(Float)、`last_decay_at`(str)。
4. **`learner_profiles`**：`student_id`(FK,unique)、`learning_style`(JSON：pace/verbosity/example_pref)、`review_enabled`(bool)、`review_frequency`(str)、`confidence_calibration`(JSON)、`updated_at`。
5. **`review_reports`**：`student_id`、`period`（week 起止）、`report`(JSON)、`created_at`、`acknowledged`(bool)。

> 迁移需 `python -m alembic upgrade head` 通过；不破坏现有种子数据（见 `20260514_*`）。

---

## 8. 主动复盘 + 间隔重复

- **调度**：`review_scheduler.py` 用 APScheduler，事件驱动为主、周期兜底。触发条件（满足其一）：
  - 某知识点 `P_eff` 跌破复习阈值（遗忘曲线到点）
  - 连续答错累计
  - 距上次复盘 ≥ 7 天（兜底，非唯一依据）
- **产物**：Reviewer 生成 `review_reports`，Planner 据此把下次 session 的 `target_skills` 指向薄弱点/待复习点，并生成专项题计划。
- **主动性有闸**：`learner_profiles.review_enabled/review_frequency` 提供开关与频率上限，避免"唠叨班主任"；复盘报告推送前不打断当前训练。

---

## 9. Web Search 工具（Tavily，受控触发）

### 9.1 核心思路：两阶段 + 归一化成 RAG 同款 chunk
web 结果**不走独立展示路径**，而是归一化成 `MaterialService` 同款 chunk，复用 `_inject_material_context` / `_format_material_context` 的注入与引用护栏。Tutor/Grader 无需区别对待。

```
用户消息
  ├─ RAG 检索(先)──► 命中且分数 ≥ RAG_MIN_SCORE? ──是──► 直接用
  │                        │否
  │                        ▼
  └─ 触发闸门(代码判定) ──► web_search(Tavily) ──► 归一化 chunk ──► 合并注入
```

### 9.2 触发闸门（确定性，不交给模型自由决定）
`should_web_search(...)` 命中其一即触发：
1. 用户显式要求联网
2. Grader 判定事实存疑需外部核实
3. 时效性查询（关键词：最新/今年/版本/赛事/新闻…）
4. RAG 命中为空或最高分 < `RAG_MIN_SCORE`

**明确不做**：学生答错就自动联网（错因靠学习者模型，不靠搜索）。

### 9.3 Provider 抽象 + 归一化
`tools/web_search.py`：

```python
class WebSearchProvider(Protocol):
    def search(self, query: str, *, max_results: int, timeout: float) -> list[dict]: ...

class TavilyProvider:
    """LLM 原生搜索：一次调用直接返回可用正文+来源，省掉单独抓取页面这一步。
    httpx client 必须挂 SOCKS5 出口代理。"""
    def search(self, query, *, max_results, timeout):
        # 归一化为 RAG 同款 chunk：
        return [{
            "content": r["content"],
            "source_label": r["title"],
            "url": r["url"],
            "score": r["score"],
            "origin": "web",            # 标识网络来源
        } for r in resp["results"][:max_results]]
```
`_format_material_context` 对 `origin=="web"` 的 chunk 加"🌐 网络来源"前缀，并**强制要求引用 URL**。

### 9.4 环境特有约束（必须处理）
- **出口直连**：生产 VPS 在新加坡，直连 `api.tavily.com`，**无需代理**。`WEB_SEARCH_PROXY` 默认留空；仅本机 dev 调试才填 SOCKS5 `127.0.0.1:10808`。httpx client 读到空值时直连。
- **与网关解耦**：web_search 后端直连 Tavily，**不经 SSSAiCode 网关**，因此不受 function-calling 透传问题影响——这也是坚持"工具确定性触发"的原因。
- **缓存**：同一 query 15 分钟 TTL 缓存（内存 dict 或小表），省钱省延迟。

### 9.5 护栏（写死在工具层）
- 超时（默认 8s）、结果条数上限（默认 3）、正文截断
- 域名 allow/block 列表（挡低质站）
- 每用户搜索频率上限（复用 `utils/rate_limit.py`）
- 失败静默降级：注入"当前无法联网核实，以下基于通用知识"，绝不硬编内容
- 全程 `AnalyticsService` 埋点，`agent_type="tool:web_search"`（可统计成本）

### 9.6 `.env` 配置项
```
WEB_SEARCH_PROVIDER=tavily
WEB_SEARCH_API_KEY=...
WEB_SEARCH_PROXY=            # VPS(新加坡)留空直连；本机 dev 才填 socks5://127.0.0.1:10808
WEB_SEARCH_MAX_RESULTS=3
WEB_SEARCH_TIMEOUT=8
RAG_MIN_SCORE=0.35
```

---

## 10. API 契约（增量）

保持现有端点不破坏。新增/调整：

- `POST /api/llm/chat`：`tutor_context` 增加只读回传 `agent_type`、`teaching_strategy`、`used_tools`、`web_search_used`（前端可展示"本轮用了什么"）。路由前先过 Orchestrator。
- `POST /api/training/sessions`：Planner 生成的计划里带 `target_skills` 来源标注（薄弱/复习/新学）。
- `GET /api/review/reports`（新）：拉取 `review_reports`。
- `POST /api/review/run`（新，可选）：手动触发一次复盘（调度之外的入口）。
- `GET /api/student/profile`（新或扩展 `student.py`）：读 `learner_profiles`（开关、学习风格）。
- `PATCH /api/student/profile`（新）：改主动复盘开关/频率。

> 前后端契约变更放同一 commit（见 AGENTS.md）。

---

## 11. 分阶段实施（里程碑，供 codex 排期）

**M1 — Agent 抽象骨架（不改行为）**
- 建 `agents/base.py`、`orchestrator.py`、`tools/registry.py`
- 把现有 role prompt 包成 Tutor/Diagnostician/Grader，`/api/llm/chat` 改为经 Orchestrator 路由，**行为对齐现状**（回归测试全绿）

**M2 — 学习者模型升级**
- `knowledge_tracing.py`（BKT + 衰减）+ Alembic（`skills`/`skill_edges`/扩列/`learner_profiles`）
- `StudentModelService` 内部切 BKT，对外接口不变

**M3 — 自适应教学 + Planner**
- `TeachingPolicy`（错因→策略映射）
- Planner 按薄弱点排专项题；`training_engine._decide_strategy` 接入 BKT `P_eff`

**M4 — 主动复盘 + 调度**
- `review_scheduler.py`（APScheduler）+ Reviewer + `review_reports` + `/api/review/*`
- `learner_profiles` 开关/频率

**M5 — Web Search 工具（Tavily）**
- `tools/web_search.py` + 受控触发路由 + 前端"来源/是否联网"展示

每个里程碑独立可交付、可回归。

---

## 12. 风险与对策

| 风险 | 对策 |
|---|---|
| SSSAiCode 网关不透传 function-calling | **v2 工具路由全部代码触发**，不依赖模型原生 tool-calls；先验证网关能力再考虑升级 |
| 多 agent 拖慢交互 | 交互路径只做"路由 + 单次 LLM 调用"；复盘异步 |
| BKT 冷启动参数不准 | 全局默认参数可配 + 达到 N 次尝试后向真实正确率收敛（沿用现有收敛思路） |
| 主动推送打扰用户 | `learner_profiles` 开关/频率上限；不打断进行中的训练 |
| Web search 幻觉/成本/延迟 | RAG-first、Tavily 直返正文、条数与超时上限、来源可见、失败降级、TTL 缓存 |
| Tavily 连通性/限额 | 新加坡 VPS 直连即可，连通性纳入 M5 验收；超额或失败降级为 RAG-only |
| 知识点主数据缺失 | M2 用 `question_skills`/`prerequisite_skills` 回填 `skills`/`skill_edges` |

---

## 13. 验收标准

- M1：现有 `backend/tests` + `frontend` e2e 全绿；`/api/llm/chat` 经 Orchestrator 后响应与基线一致。
- M2：`alembic upgrade head` 通过；给定答题序列，BKT `P_known` 单调性/衰减符合单测预期；`student_model` 对外接口零破坏。
- M3：`TeachingPolicy.select(...)` 对 [附录 A](#附录-a教学策略-teachingpolicy-eval-用例) 全部用例返回预期 `expected_teaching_strategy`（确定性单测，硬门槛）；`backend/evals/teaching_policy_cases.jsonl` schema 校验通过；薄弱点能进入下次 session `target_skills`。
- M4：满足触发条件时生成 `review_reports`；关闭开关后不再主动推送。
- M5：四类触发（显式/时效/低分/Grader）能命中 Tavily 且标注来源 URL；RAG 命中时不误触发；VPS 直连 `api.tavily.com` 连通。
- 全程沿用 `AnalyticsService` 埋点（`agent_type` 维度可分 agent/工具统计）。

---

## 14. 给 codex 的开工提示

- 规范见 `AGENTS.md`：后端 `python -m compileall app tests` + `python -m unittest discover -s tests`；前端 `npm run type-check`/`lint`/`build`。
- **严格按 M1→M5 顺序**，每个里程碑单独提交、独立回归。
- 复用优先于新建：能包现有 service 就不要重写；`LLMService` 逐步退化为纯模型网关。
- API/DB 契约变更同一 commit；不提交本地库/上传件/venv。
- 不确定网关工具调用能力时，**默认走确定性工具路由**，并在 PR 里记录验证结果。

---

## 附录 A｜教学策略 TeachingPolicy eval 用例

### A.1 策略 id 定义（`TeachingPolicy` 的输出集合）

| 策略 id | 含义 | 落地方式 |
|---|---|---|
| `explain` | 类比/费曼讲解概念 | 复用 `prompt_profiles["explain"]`（+ three_stage 的概念解释师） |
| `socratic` | 追问引导 | 复用 `prompt_profiles["socratic"]` |
| `recompute` | 定位出错步骤 + 让学生自己重算（轻提示） | **新增策略**，复用 `diagnose` 定位 + hint 轻提示 |
| `reread` | 引导重读题干、圈关键条件 | **新增策略** |
| `coach` | 降难度 + 鼓励 + 节奏 | 复用 `prompt_profiles["coach"]` |
| `exam` | 限时、暂扣答案 | 复用 `prompt_profiles["exam"]` |

### A.2 选择函数契约

```python
def select(error_type: str | None, signals: dict, mode: str | None,
           profile: LearnerStyle | None = None) -> str:  # 返回策略 id
    ...
```

**优先级（从高到低，codex 必须按此顺序实现）**
1. `mode == "exam"` → `exam`
2. `signals.fatigue` 或 `signals.consecutive_errors >= 3` → `coach`（**覆盖错因映射**）
3. 按 `error_type` 映射：`concept_error→explain`、`method_error→socratic`、`calculation_error→recompute`、`reading_error→reread`
4. 兜底 → `socratic`

`profile`（学习风格）只调节策略内部的详略/例子多寡，**不改变策略 id 选择**。

### A.3 落地文件

- `backend/evals/teaching_policy_cases.jsonl`（沿用现有 case schema，`expectations` 内**新增** `expected_teaching_strategy` 键；`evaluate_tutor_behavior.py` 用 `**expectations` 透传，额外键不影响 schema 校验）。
- 扩展 `backend/scripts/evaluate_tutor_behavior.py`：当 case 含 `expected_teaching_strategy` 时，直接对 `TeachingPolicy.select(...)` 做**确定性断言**（无需 LLM），作为 M3 硬门槛；行为类 `required/forbidden_behaviors` 留给未来 LLM-judge。
- 建议同时加一份纯单测 `backend/tests/test_teaching_policy.py` 覆盖 A.2 优先级。

### A.4 用例（逐行写入 `teaching_policy_cases.jsonl`）

```jsonl
{"id":"teaching-policy-concept-001","category":"teaching_policy","prompt_profile":"auto","messages":[{"role":"user","content":"条件概率和联合概率我总搞混，P(A|B) 和 P(A∩B) 不是一回事吗？"}],"tutor_context":{"error_type":"concept_error"},"expectations":{"expected_teaching_strategy":"explain","required_behaviors":["use_simple_analogy","include_contrast_example","pause_for_check"],"forbidden_behaviors":["socratic_only_no_explanation","formula_dump_first"]},"notes":"概念误解→explain：类比+对比例子澄清，而非纯追问。"}
{"id":"teaching-policy-method-001","category":"teaching_policy","prompt_profile":"auto","messages":[{"role":"user","content":"这道行程题我设未知数列方程，越算越乱，是不是方法不对？"}],"tutor_context":{"error_type":"method_error"},"expectations":{"expected_teaching_strategy":"socratic","required_behaviors":["ask_guiding_question","help_student_compare_methods","one_step_at_a_time"],"forbidden_behaviors":["give_full_solution_immediately","lecture_dump"]},"notes":"方法/思路错→socratic：追问引导学生发现更优方法。"}
{"id":"teaching-policy-calc-001","category":"teaching_policy","prompt_profile":"auto","messages":[{"role":"user","content":"3(x-2)=12 我知道要展开，但算成 x=14/3 了。"}],"tutor_context":{"error_type":"calculation_error"},"expectations":{"expected_teaching_strategy":"recompute","required_behaviors":["locate_specific_error_step","ask_student_to_redo_that_step","light_hint_only"],"forbidden_behaviors":["reteach_whole_concept","give_final_answer_without_prompting"]},"notes":"计算错→recompute：只定位出错步骤让学生重算，不重讲概念。"}
{"id":"teaching-policy-reading-001","category":"teaching_policy","prompt_profile":"auto","messages":[{"role":"user","content":"题目问的是至少两次，我按恰好两次算的，怎么会错？"}],"tutor_context":{"error_type":"reading_error"},"expectations":{"expected_teaching_strategy":"reread","required_behaviors":["guide_student_to_reread_prompt","highlight_key_condition","confirm_understanding_before_solving"],"forbidden_behaviors":["jump_to_calculation","ignore_misread_condition"]},"notes":"审题错→reread：引导重读题干、圈关键条件。"}
{"id":"teaching-policy-fatigue-001","category":"teaching_policy","prompt_profile":"auto","messages":[{"role":"user","content":"这题又错了……今天第五题错了，脑子转不动。"}],"tutor_context":{"error_type":"concept_error","signals":{"consecutive_errors":3,"fatigue":true}},"expectations":{"expected_teaching_strategy":"coach","required_behaviors":["acknowledge_effort","lower_difficulty","suggest_break_or_pace"],"forbidden_behaviors":["push_harder_question","shame_student"]},"notes":"疲劳/连错覆盖错因映射→coach，即使存在 concept_error。"}
{"id":"teaching-policy-exam-001","category":"teaching_policy","prompt_profile":"auto","messages":[{"role":"user","content":"开始考试训练，雅思阅读，给我限时做题。"}],"tutor_context":{"mode":"exam","error_type":"method_error"},"expectations":{"expected_teaching_strategy":"exam","required_behaviors":["enforce_time_limit","withhold_answers_until_submitted","batch_questions"],"forbidden_behaviors":["reveal_answers_early","unlimited_hints"]},"notes":"exam 模式覆盖错因映射→exam。"}
```

> 前两条边界用例（fatigue、exam）专门验证 A.2 的优先级覆盖，防止 codex 只写"错因→策略"单层映射而漏掉覆盖规则。
</content>
