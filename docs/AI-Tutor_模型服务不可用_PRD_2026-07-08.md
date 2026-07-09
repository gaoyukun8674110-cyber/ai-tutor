# PRD：AI Tutor「模型服务暂时不可用」修复

- **日期**：2026-07-08
- **状态**：VPS 已打热补丁（临时生效），**仓库未修复，需 codex 正式落库**
- **优先级**：P0（线上展示项目，面向 HR）
- **相关服务**：`ai-tutor-backend`（FastAPI，容器 `ai-tutor-backend-1`，VPS `96.9.210.217:8001`）
- **前端**：Vercel 部署，`/api/*` 反代至 `http://96.9.210.217:8001`

---

## 1. 现象

前端页面正常渲染，但任意对话消息发出后立即弹出错误横幅：

> ⚠️ 模型服务暂时不可用 (trace `fe7b177fb34342589508c0cf20c08222`)

后端 `POST /api/llm/chat` 返回 `502 Bad Gateway`。

## 2. 影响

- 全部依赖 LLM 的功能不可用：主对话、提示（hint）、讲解、错误诊断、Session 总结。
- 前端本身、Vercel 反代、后端进程、数据库均正常——纯粹是**后端 → 模型提供商**这一跳失败。

## 3. 根因（已定位，证据确凿）

供应商由旧渠道切换到 **SSSAiCode「基础充值V2 / node-cf」渠道 + 模型 `gpt-5.5`** 后触发。

后端每次调用 chat completions 都硬传了 `temperature` 参数，而 **`gpt-5.5` 这条渠道不接受 `temperature`**（与 OpenAI gpt-5 系列一致：只允许默认值，显式传参即报错）。

**后端日志（trace 与前端截图一致）**：
```
LLM provider error trace_id=fe7b177fb34342589508c0cf20c08222
error=BadRequestError('Error code: 400 - {... "message": "请求参数错误:
{\"detail\":\"Unsupported parameter: temperature\"}"}')
INFO: POST /api/llm/chat HTTP/1.1 502 Bad Gateway
```

**参数级验证**（直连真实端点 `node-cf.sssaicodeapi.com/api/v1`，用容器内真实 key）：

| 请求参数 | 结果 |
|---|---|
| 非流式（无 stream） | 400 `Stream must be set to true` |
| `stream:true` | ✅ 200，`gpt-5.5` 正常吐字 |
| `stream:true` + `temperature` | ❌ 400 `Unsupported parameter: temperature` |
| `stream:true` + `max_tokens` | ✅ 200 |
| `stream:true` + `stream_options` | ✅ 200 |
| `stream:true` + `max_completion_tokens` | ✅ 200 |

结论：**唯一不被接受的参数是 `temperature`**。key 有效、余额充足（$82.41）、模型名 `gpt-5.5` 正确、`stream`/`max_tokens` 均无问题。

## 4. 代码定位

所有 LLM 调用都收敛到单一咽喉点：

- `backend/app/services/llm_service.py` → `LLMService._create_chat_completion(self, client, **kwargs)`
  - 主对话 `complete_chat`、`chat`，以及 `generate_hint`/`explain_solution`/`diagnose_error`/`session_summary` **全部**经此方法，均以 `temperature=...` 传入 kwargs 后转发给 `client.chat.completions.create(**kwargs)`。
  - 该方法已强制 `stream=True`，故「Stream must be set to true」不会发生；**唯一问题是透传了 `temperature`**。

各调用点传入的 temperature 值：`complete_chat`/`chat` 用 `settings.OPENAI_TEMPERATURE`；hint/explain=0.7、diagnose=0.5、summary=0.8。

## 5. 已实施的热补丁（VPS 临时，未入库）

> ⚠️ 仅存在于 VPS 运行环境，**下次 `git pull` / 重建镜像会被覆盖**。这份 PRD 的目的就是让 codex 把它正式落进仓库。

在 `_create_chat_completion` 首行加入：
```python
kwargs.pop("temperature", None)  # gpt-5.5 (sssaicode) rejects an explicit temperature param
```
- 已改 VPS 源码 `/root/ai-tutor/backend/app/services/llm_service.py`（备份 `*.bak-temp-fix`）→ `docker cp` 进容器 → `docker restart`。
- 端到端验证：传 `temperature=0.7` 时被剥离，`gpt-5.5` 正常返回。

## 6. 需要 codex 做的正式修复（落库到 `H:\ai-tutor`）

**目标**：仓库层面根治，重建镜像/重新部署后依然生效；并比热补丁更稳妥。

1. **主修复**：在 `_create_chat_completion` 统一剥离/处理不被支持的采样参数。
   - 最简：无条件 `kwargs.pop("temperature", None)`（当前热补丁做法）。
   - **更优（建议）**：做成「提供商能力感知」——仅当模型属于 gpt-5 系列 / 或命中一个「不支持 temperature」的配置集时才剥离；或采用「先带参调用，遇到 `Unsupported parameter` 类 400 时自动去参重试」的自愈逻辑，兼容未来切回支持 temperature 的模型。二选一，请在实现里写清取舍。
   - 若走「自愈重试」，注意别让每次请求都白跑一次失败调用（对展示项目的首字延迟敏感）。

2. **顺带**：`stream_options.include_usage` 在该渠道未回传 usage，导致 `usage` 全为 `None`、token 统计与分析日志缺失。请评估是否改为非致命降级（已是），或在无 usage 时用 tokenizer 估算，或记录一条 warning。非阻塞。

3. **配置化**：把「模型 → 不支持参数集」或「采样参数是否下发」做成 settings/provider 配置，避免下次换模型再硬编码踩坑。

4. **测试**：补一个单元测试——当传入 `temperature` 且目标为 gpt-5 系列时，最终发给 provider 的 payload 不含 `temperature`；并保证其他参数（`max_tokens`、`messages`、`stream`）不受影响。

## 7. 验收标准

- [ ] 仓库代码在重建镜像后，`POST /api/llm/chat` 返回 200 且正常出字（不再 502）。
- [ ] 提示/讲解/诊断/总结四个辅助功能均可用。
- [ ] 存在覆盖「gpt-5 系列不下发 temperature」的自动化测试。
- [ ] 切回一个支持 temperature 的模型时（如走另一条渠道）功能不回归。

## 8. 安全待办（独立于本 bug，需尽快）

- 🔴 **轮换泄露的 API key**：排障过程中该 key 曾以明文出现在桌面截图（本 PRD 已隐去，形如 `sk-sssaicode-b4e7…`）。请在 SSSAiCode 后台**重建 key**，然后更新 VPS `/root/ai-tutor/.env` 的 `OPENAI_API_KEY` 并 `docker compose up -d` 重建生效。
- 建议在 SSSAiCode 后台开启余额告警/支出限额，防盗刷。

## 9. 附录：环境与复现命令

**关键环境（容器内实测）**
```
OPENAI_BASE_URL = https://node-cf.sssaicodeapi.com/api/v1
OPENAI_MODEL    = gpt-5.5
DEFAULT_LLM_PROVIDER = openai
ALLOW_GLOBAL_LLM_FALLBACK = true
OPENAI_API_KEY  = (77 chars，已在 .env)
```

**复现 400（在 VPS 上，参数级）**
```bash
# 用容器内真实 env，非流式或带 temperature 均会 400
docker exec ai-tutor-backend-1 python - <<'PY'
import os, json, urllib.request, urllib.error
base=os.environ["OPENAI_BASE_URL"]; key=os.environ["OPENAI_API_KEY"]; model=os.environ["OPENAI_MODEL"]
body={"model":model,"stream":True,"temperature":0.7,"messages":[{"role":"user","content":"hi"}]}
req=urllib.request.Request(base+"/chat/completions", data=json.dumps(body).encode(),
    headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
try:
    r=urllib.request.urlopen(req,timeout=30); print("HTTP",r.status)
except urllib.error.HTTPError as e:
    print("HTTP",e.code, e.read()[:300].decode())
PY
```

**验证修复（service 层，绕过 HTTP 鉴权）**
```bash
docker exec ai-tutor-backend-1 python - <<'PY'
import os
from openai import OpenAI
from app.services.llm_service import LLMService
svc=LLMService.__new__(LLMService)
c=OpenAI(api_key=os.environ["OPENAI_API_KEY"], base_url=os.environ["OPENAI_BASE_URL"])
content,usage=svc._create_chat_completion(c, model=os.environ["OPENAI_MODEL"],
    messages=[{"role":"user","content":"用一句话说你好"}], temperature=0.7, max_tokens=60)
print("CONTENT=",repr(content),"USAGE=",usage)
PY
```

**部署（正式修复入库后）**
```bash
cd /root/ai-tutor && git pull && docker compose up -d --build backend
```
