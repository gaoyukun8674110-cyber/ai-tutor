# AI Tutor Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a backend-proxied multi-provider Tutor chat and a frontend Tutor workspace with Pomodoro session flow.

**Architecture:** Backend owns provider configuration, prompt profiles, and model API calls. Frontend consumes safe provider/profile metadata and renders a study workspace where the model behaves as a Tutor through selected backend prompt profiles.

**Tech Stack:** FastAPI, Pydantic, OpenAI-compatible chat completions, React 18, Vite, lucide-react, existing glass-style settings tokens.

---

## Files
- Create: `tests/test_llm_chat.py`
- Modify: `app/config.py`
- Modify: `app/services/llm_service.py`
- Modify: `app/api/llm.py`
- Create: `../frontend/src/utils/chatApi.ts`
- Create: `../frontend/src/components/TutorChatWorkspace.tsx`
- Modify: `../frontend/src/components/StartTraining.tsx`
- Modify: `../frontend/src/App.tsx`
- Create: `../frontend/.gitignore`

## Task 1: Backend provider and prompt metadata
- [ ] Write failing unittest for provider metadata and prompt profile metadata in `tests/test_llm_chat.py`.
- [ ] Run `python -m unittest tests.test_llm_chat -v` and confirm failure because methods are missing.
- [ ] Add provider config fields in `app/config.py`.
- [ ] Add `get_provider_metadata()` and `get_prompt_profiles()` in `app/services/llm_service.py`.
- [ ] Add `GET /api/llm/providers` and `GET /api/llm/prompt-profiles` in `app/api/llm.py`.
- [ ] Run `python -m unittest tests.test_llm_chat -v` and confirm pass.

## Task 2: Backend OpenAI-compatible chat adapter
- [ ] Add failing unittest that monkeypatches a fake OpenAI-compatible client and verifies selected provider, model, prompt profile, and message composition.
- [ ] Run the unittest and confirm failure.
- [ ] Implement `chat()` in `LLMService` using provider settings, prompt profiles, and OpenAI-compatible client construction.
- [ ] Add `POST /api/llm/chat`.
- [ ] Run backend unit tests and compile checks.

## Task 3: Frontend API client
- [ ] Create `src/utils/chatApi.ts` with typed functions for providers, prompt profiles, and chat requests.
- [ ] Keep API base configurable via `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`.
- [ ] Validate by running frontend build after component integration.

## Task 4: Tutor workspace UI
- [ ] Create `TutorChatWorkspace.tsx` with session timer, provider/model selector, prompt profile selector, message list, quick actions, and input.
- [ ] Use existing `useSettings()` tokens and lucide icons.
- [ ] Ensure empty/error/loading states are visible and readable.
- [ ] Keep cards shallow; no nested card-heavy layout.

## Task 5: Entry page integration
- [ ] Modify `StartTraining` to expose an `onStartTutorSession` callback.
- [ ] Modify `App.tsx` to switch between dashboard and Tutor workspace.
- [ ] Start the Pomodoro countdown when entering the Tutor workspace.
- [ ] Add an exit action returning to the dashboard.

## Task 6: Verification and staging notes
- [ ] Run backend unit tests.
- [ ] Run backend compile check.
- [ ] Run frontend build.
- [ ] Commit staged mirror changes.
- [ ] If H: drive write approval becomes available, apply mirror changes back to `H:\AI Tutor` and `H:\AI Tutor fornt end`.

## Task 7: Tutor conversation history
- [x] Add persistent Tutor conversation and message models.
- [x] Add backend history service for save, list, load, and delete.
- [x] Add `/api/llm/conversations` list/detail/delete endpoints.
- [x] Extend `/api/llm/chat` to accept and return `conversation_id`.
- [x] Connect frontend sidebar history to real backend records.
- [x] Restore chat messages when a history item is clicked.
- [x] Add backend unit test for history persistence.
- [x] Run backend tests, backend compile check, and frontend build.

## Task 8: Shared Pomodoro cycle
- [x] Add shared Pomodoro duration and break-cycle utility.
- [x] Use one shared default of 45-minute focus, 10-minute short break, and 20-minute long break.
- [x] Make completed focus rounds alternate breaks as 10 minutes, then 20 minutes, then repeat.
- [x] Wire both dashboard Pomodoro and Tutor workspace timer to the shared rule.
- [x] Run frontend build.

## Task 9: Tutor context window and summary handoff
- [x] Add context-window spec for 0-10 / 10-15 / 15+ exchange behavior.
- [x] Add persisted conversation digest table.
- [x] Generate or fallback-create a study summary after 15 exchanges.
- [x] Compact later model requests to summary + recent 6 exchanges + current user message.
- [x] Return exchange-count and new-chat recommendation metadata from `/api/llm/chat`.
- [x] Show frontend warning after 10 exchanges.
- [x] Show frontend new-chat action after 15 exchanges.
- [x] Carry summary and recent context into a new chat through `tutor_context`.
- [x] Run backend tests, backend compile check, and frontend build.

## Task 10: Three-stage Tutor learning method
- [x] Add spec for the three-stage learning method.
- [x] Add `three_stage` prompt profile with learning designer, concept explainer, and Feynman coach rules.
- [x] Add backend phase detection for planning, understanding, Feynman, and general messages.
- [x] Make backend chat default to `three_stage`.
- [x] Return `learning_phase` from `/api/llm/chat`.
- [x] Update summary generation to preserve learning phase and learning-state fields.
- [x] Make frontend default to `three_stage`.
- [x] Route quick actions through the same three-stage strategy.
- [x] Show current learning phase in the Tutor workspace header.
- [x] Run backend tests, backend compile check, and frontend build.

## Task 11: P1 audit remediation
- [x] Add upload size and MIME/magic-byte validation.
- [x] Split material creation into pending record plus background embedding fill.
- [x] Return `embedding_mode` in material payloads and search responses.
- [x] Add baseline FastAPI security headers.
- [x] Merge conversation summary prompt into one coherent prompt.
- [x] Add or update backend tests for auth, CORS, upload validation, and embedding mode.
- [x] Run backend unit tests.

## Task 12: P2 audit remediation
- [x] Add sanitized API error schema and trace IDs.
- [x] Cache OpenAI-compatible provider clients in `LLMService`.
- [x] Harden material storage names after sanitization.
- [x] Split `tutor_chat` orchestration into helper functions.
- [x] Add regression tests for sanitized provider errors and client reuse.
- [x] Run backend unit tests.
