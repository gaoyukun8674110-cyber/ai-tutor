# Ralph: AI Tutor Chat

## Iteration 1 - 2026-04-29

### Status
- [x] In Progress | [ ] Blocked | [ ] Complete

### What Was Done
- Created writable project mirrors under `ai-tutor-work/`.
- Initialized Git repositories in backend and frontend mirrors.
- Wrote design spec and implementation plan.

### Blockers
- Direct writes to `H:\AI Tutor` and `H:\AI Tutor fornt end` still fail through the sandbox approval path.

### Next Step
Implement Task 1 with backend tests first.

### Files Changed
- `AGENTS.md` - project operations
- `specs/ai-tutor-chat.md` - design spec
- `IMPLEMENTATION_PLAN.md` - Ralph implementation plan
- `PROGRESS.md` - iteration log

## Iteration 2 - 2026-04-29

### Status
- [x] In Progress | [ ] Blocked | [ ] Complete

### What Was Done
- Added failing backend tests for provider metadata, prompt profile metadata, and OpenAI-compatible Tutor chat composition.
- Implemented backend provider configuration fields.
- Implemented safe provider metadata, multiple Tutor prompt profiles, and unified `LLMService.chat()`.
- Added `/api/llm/providers`, `/api/llm/prompt-profiles`, and `/api/llm/chat`.

### Validation
- `python -m unittest tests.test_llm_chat -v` passes.

### Blockers
- Full backend dependency install is blocked by network approval timeout; tests use stubs to isolate `llm_service.py`.
- Direct H: writes and mirror Git follow-up commits remain blocked by sandbox approval/ACL behavior.

### Next Step
Implement frontend chat API client and Tutor workspace.

### Files Changed
- `tests/test_llm_chat.py` - backend chat service tests
- `.gitignore` - local virtualenv/dependency-target ignores
- `app/config.py` - provider configuration
- `app/services/llm_service.py` - provider registry, prompt profiles, chat method
- `app/api/llm.py` - provider/profile/chat endpoints

## Iteration 3 - 2026-04-29

### Status
- [x] In Progress | [ ] Blocked | [ ] Complete

### What Was Done
- Added frontend chat API client for providers, prompt profiles, and Tutor chat.
- Added Tutor workspace UI with provider/model selector, prompt profile selector, custom system prompt entry, message list, quick actions, and Pomodoro timer controls.
- Wired existing `StartTraining` button to enter the Tutor workspace without redesigning the dashboard.
- Added frontend `.gitignore`.

### Validation
- `python -m compileall app tests` passes.
- Direct `esbuild.exe src\main.tsx --bundle ...` passes and emits `build\verify.js` / `build\verify.css`.
- `npm.cmd run build` is blocked by Node child-process `spawn EPERM` when Vite starts esbuild inside the sandbox.

### Blockers
- Vite production build cannot run in this sandbox because Node child-process spawn is denied.
- Direct H: project writes still cannot be performed by the tool despite user approval text.

### Next Step
Run a code scan for generated verification artifacts, remove unneeded build output, then summarize staged changes and H: application path.

### Files Changed
- `../frontend/src/utils/chatApi.ts` - chat API client
- `../frontend/src/components/TutorChatWorkspace.tsx` - Tutor learning workspace
- `../frontend/src/components/StartTraining.tsx` - entry button callback
- `../frontend/src/App.tsx` - dashboard/workspace state switch
- `../frontend/.gitignore` - frontend ignore rules

## Status: COMPLETE IN MIRROR / H: SYNC BLOCKED
**Finished:** 2026-04-29

### Final Verification
- [x] Backend unit tests: `python -m unittest tests.test_llm_chat -v`
- [x] Backend compile: `python -m compileall app tests`
- [x] Frontend syntax/bundle verification: direct `esbuild.exe src\main.tsx --bundle ...`
- [ ] Vite build: blocked by sandbox `spawn EPERM`
- [ ] Sync to `H:\AI Tutor*`: blocked by sandbox escalation timeout

### Files Created Or Modified
- `backend/.gitignore`
- `backend/AGENTS.md`
- `backend/IMPLEMENTATION_PLAN.md`
- `backend/PROGRESS.md`
- `backend/specs/ai-tutor-chat.md`
- `backend/tests/test_llm_chat.py`
- `backend/app/config.py`
- `backend/app/services/llm_service.py`
- `backend/app/api/llm.py`
- `frontend/.gitignore`
- `frontend/src/utils/chatApi.ts`
- `frontend/src/components/TutorChatWorkspace.tsx`
- `frontend/src/components/StartTraining.tsx`
- `frontend/src/App.tsx`

## Iteration 4 - 2026-04-30

### Status
- [ ] In Progress | [ ] Blocked | [x] Complete

### What Was Done
- Added real Tutor conversation persistence instead of empty in-memory sidebar history.
- Added `tutor_conversations` and `tutor_conversation_messages` models.
- Added chat history service methods for save, list, load, and delete.
- Added conversation list/detail/delete API routes under `/api/llm`.
- Extended `/api/llm/chat` to accept and return `conversation_id`.
- Wired frontend sidebar history to load real backend conversations and restore messages when clicked.
- Kept empty history empty, with no fake records.

### Validation
- `.\.venv\Scripts\python.exe -m unittest tests.test_chat_history -v` passes.
- `.\.venv\Scripts\python.exe -m unittest tests.test_llm_chat -v` passes.
- `python -m compileall app tests` passes.
- `npm.cmd run build` passes in `H:\AI Tutor fornt end`.

### Next Step
Restart the backend so FastAPI registers the new routes and creates the new SQLite tables.

### Files Changed
- `specs/tutor-conversation-history.md` - feature spec and acceptance criteria
- `IMPLEMENTATION_PLAN.md` - completed Task 7 checklist
- `PROGRESS.md` - Ralph iteration log
- `app/models/chat_history.py` - conversation persistence models
- `app/models/__init__.py` - model exports
- `app/services/chat_history.py` - history persistence service
- `app/api/llm.py` - history endpoints and chat persistence integration
- `tests/test_chat_history.py` - save/list/load/delete unit test
- `tests/test_llm_chat.py` - updated fake settings for LinkAPI config
- `../AI Tutor fornt end/src/utils/chatApi.ts` - history API client
- `../AI Tutor fornt end/src/components/TutorChatWorkspace.tsx` - real sidebar history behavior

## Iteration 5 - 2026-04-30

### Status
- [ ] In Progress | [ ] Blocked | [x] Complete

### What Was Done
- Fixed Tutor workspace sidebar timer default so it matches the dashboard Pomodoro default.
- Changed Tutor workspace focus timer from `25:00` to `45:00`.
- Updated the fallback timer value from 25 minutes to 45 minutes.

### Validation
- `npm.cmd run build` passes in `H:\AI Tutor fornt end`.

### Next Step
- Refresh the frontend page or restart the frontend dev server if it is serving stale code.

### Files Changed
- `../AI Tutor fornt end/src/components/TutorChatWorkspace.tsx` - Tutor workspace timer defaults

## Iteration 6 - 2026-04-30

### Status
- [ ] In Progress | [ ] Blocked | [x] Complete

### What Was Done
- Added shared Pomodoro configuration in `src/utils/pomodoro.ts`.
- Removed separate hard-coded default durations from the dashboard Pomodoro and Tutor workspace timer.
- Implemented alternating break cycle: first completed focus round -> 10-minute break, second -> 20-minute break, then repeat.
- Updated the Tutor workspace timer to use the same shared duration and break-cycle rules.
- Updated the dashboard Pomodoro completion flow so the next timer phase is the correct break/work phase instead of falling to `00:00`.

### Validation
- `npm.cmd run build` passes in `H:\AI Tutor fornt end`.

### Next Step
- Refresh the frontend page or restart the frontend dev server if it is serving stale code.

### Files Changed
- `../AI Tutor fornt end/src/utils/pomodoro.ts` - shared Pomodoro durations and break-cycle helper
- `../AI Tutor fornt end/src/components/PomodoroTimer.tsx` - dashboard Pomodoro uses shared cycle
- `../AI Tutor fornt end/src/components/TutorChatWorkspace.tsx` - Tutor sidebar timer uses shared cycle

## Iteration 7 - 2026-04-30

### Status
- [ ] In Progress | [ ] Blocked | [x] Complete

### What Was Done
- Added `specs/tutor-context-window.md` for the agreed context-window policy.
- Added persisted conversation digest model for long Tutor chats.
- Added backend logic to generate a study summary after 15 exchanges.
- Added backend logic to compact later model requests to summary + recent 6 exchanges + current message.
- Added backend response metadata for exchange count, suggested new chat, start-new-chat threshold, summary generation, and context policy.
- Added frontend warnings after 10 exchanges and a new-chat action after 15 exchanges.
- Added frontend carry-over of summary and recent context into a new chat via `tutor_context`.

### Validation
- `.\.venv\Scripts\python.exe -m unittest tests.test_chat_history -v` passes.
- `.\.venv\Scripts\python.exe -m unittest tests.test_llm_chat -v` passes.
- `python -m compileall app tests` passes.
- `npm.cmd run build` passes in `H:\AI Tutor fornt end`.

### Next Step
- Restart the backend so FastAPI creates the new `tutor_conversation_digests` table.
- Refresh or restart the frontend dev server if it is serving stale code.

### Files Changed
- `specs/tutor-context-window.md` - context-window requirements
- `IMPLEMENTATION_PLAN.md` - completed Task 9 checklist
- `PROGRESS.md` - Ralph iteration log
- `app/models/chat_history.py` - conversation digest model
- `app/models/__init__.py` - digest model export
- `app/services/chat_history.py` - summary and compact-context helpers
- `app/api/llm.py` - summary generation, compact-context path, response metadata
- `tests/test_chat_history.py` - compact-context unit test
- `../AI Tutor fornt end/src/utils/chatApi.ts` - response metadata types
- `../AI Tutor fornt end/src/components/TutorChatWorkspace.tsx` - warning/new-chat UI and carry-over context

## Iteration 8 - 2026-04-30

### Status
- [ ] In Progress | [ ] Blocked | [x] Complete

### What Was Done
- Added `specs/three-stage-learning.md` for the learning designer / concept explainer / Feynman coach method.
- Added a backend `three_stage` prompt profile based on the user's learning prompt.
- Added backend phase detection for planning, understanding, Feynman check, and general messages.
- Made backend chat default to `three_stage`.
- Added `learning_phase` to chat responses.
- Updated long-conversation summary generation to preserve learning phase, 80/20 knowledge, understood concepts, stuck concepts, Feynman missing points, and next step.
- Made the frontend Tutor workspace default to the `three_stage` profile.
- Routed quick actions through the same three-stage strategy.
- Added a small current-phase label in the Tutor workspace header.
- Fixed `tests/test_llm_chat.py` module isolation so combined backend tests can run with chat-history tests.

### Validation
- `.\.venv\Scripts\python.exe -m unittest tests.test_llm_chat tests.test_chat_history -v` passes.
- `python -m compileall app tests` passes.
- `npm.cmd run build` passes in `H:\AI Tutor fornt end`.

### Next Step
- Restart the backend so the new default profile and API response behavior are active.
- Refresh or restart the frontend dev server if the browser still serves the old bundle.

### Files Changed
- `specs/three-stage-learning.md` - three-stage method spec
- `IMPLEMENTATION_PLAN.md` - completed Task 10 checklist
- `PROGRESS.md` - Ralph iteration log
- `app/services/llm_service.py` - `three_stage` profile, phase detection, phase-aware chat context
- `app/api/llm.py` - default profile, phase context, phase response, summary-state prompt
- `tests/test_llm_chat.py` - phase detection/profile tests and module isolation fix
- `../AI Tutor fornt end/src/utils/chatApi.ts` - `learning_phase` response typing
- `../AI Tutor fornt end/src/components/TutorChatWorkspace.tsx` - default profile, phase badge, quick-action routing

## Iteration 9 - 2026-05-06

### Status
- [x] In Progress | [ ] Blocked | [ ] Complete

### What Was Done
- Started P1 audit remediation against `AI_TUTOR_AUDIT-1.md`.
- Added a P1 remediation spec and backend implementation checklist.
- Confirmed required frontend dependencies `@tanstack/react-query` and `rehype-sanitize` were missing.
- Installed the required frontend dependencies with npm and verified npm audit reported 0 vulnerabilities.

### Validation
- `npm.cmd install @tanstack/react-query rehype-sanitize --save` completed successfully.

### Blockers
- None.

### Next Step
- Implement backend P1 upload/RAG/security changes and tests.

### Files Changed
- `specs/p1-audit-remediation.md` - P1 remediation acceptance criteria
- `IMPLEMENTATION_PLAN.md` - P1 backend checklist
- `PROGRESS.md` - Ralph iteration log

## Status: COMPLETE
**Finished:** 2026-05-06

### Final Verification
- [x] Backend unit tests: `.\.venv\Scripts\python.exe -m unittest discover -v` passed, 33 tests.
- [x] Frontend type-check: `npm run type-check` passed.
- [x] Frontend lint: `npm run lint` passed.
- [x] Frontend build: `npm run build` passed.
- [x] Frontend audit: `npm.cmd audit --omit=dev` found 0 vulnerabilities.
- [x] Frontend regression: `node --test scripts\test-p0-audit-fixes.mjs scripts\test-tutor-pomodoro-persistence.mjs scripts\test-p1-audit-fixes.mjs` passed.
- [ ] Backend `ruff`/`mypy`: dev tool installation timed out in this environment; config and CI files were added.

### Files Changed
- Backend upload/RAG/security: `app/api/materials.py`, `app/services/materials.py`, `app/utils/upload.py`, `app/main.py`, `app/config.py`.
- Backend tests/config/docs: `tests/test_materials_api.py`, `tests/test_security_headers.py`, `requirements-dev.txt`, `ruff.toml`, `pyproject.toml`, `.env.example`, `.github/workflows/ci.yml`, `README.md`.
- Frontend API/state/security/UI: `src/utils/apiClient.ts`, `src/utils/settings.tsx`, `src/utils/glassStyles.ts`, `src/App.tsx`, `src/main.tsx`, `src/components/TutorChatWorkspace.tsx`, `src/components/tutor/TutorSidebar.tsx`, `src/components/MathMessage.tsx`.
- Frontend cleanup/docs/tests: `package.json`, `package-lock.json`, `scripts/test-p1-audit-fixes.mjs`, `README.md`, `specs/p1-audit-remediation.md`.

## Iteration 10 - 2026-05-06

### Status
- [ ] In Progress | [ ] Blocked | [x] Complete

### What Was Done
- Started P2 audit remediation with `ralph-mode` and `self-improvement`.
- Began backend hardening for sanitized errors, trace IDs, and `tutor_chat` helper extraction.
- Added public API error helpers and registered FastAPI exception handlers.
- Changed auth, upload validation, and LLM provider failures to return public error codes, user messages, and trace IDs.
- Cached OpenAI-compatible clients per provider in `LLMService`.
- Added material filename fallback after sanitization and split `tutor_chat` into helper functions.
- Added regression coverage for provider client reuse, sanitized provider exceptions, and public HTTP error schema.

### Validation
- `.\.venv\Scripts\python.exe -m unittest tests.test_api_auth tests.test_materials_api tests.test_security_headers tests.test_llm_chat -v` passed, 17 tests.
- `.\.venv\Scripts\python.exe -m unittest discover -v` passed, 36 tests.

### Blockers
- None.

### Next Step
- P2 backend directly actionable items are complete.

### Files Changed
- `IMPLEMENTATION_PLAN.md` - P2 backend checklist.
- `PROGRESS.md` - Ralph iteration log.
- `app/api/llm.py` - initial helper extraction and sanitized LLM API errors.
- `app/utils/errors.py` - API error helpers.
- `app/main.py` - global exception handler registration.
- `app/api/deps.py`, `app/api/materials.py`, `app/utils/upload.py` - source-level public error schema for route-level apps.
- `app/services/llm_service.py`, `app/services/materials.py` - client cache, safe LLM errors, and sanitized filename fallback.
- `tests/test_api_auth.py`, `tests/test_materials_api.py`, `tests/test_security_headers.py`, `tests/test_llm_chat.py` - P2 regression coverage.
