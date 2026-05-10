# AI Tutor Master Plan

## Purpose
This is the single cross-project planning file for `H:\ai-tutor`.
Project-wide planning is maintained here only.
Backend execution details live in `backend/IMPLEMENTATION_PLAN.md`.
Frontend execution details live in `frontend/IMPLEMENTATION_PLAN.md`.

## Current Status
- Status: stable consolidation baseline reached on 2026-05-08.
- Canonical workspace: `H:\ai-tutor` has been the active monorepo since 2026-05-09.
- Cross-project blockers from the archived planning set: none.
- Mandatory overall backlog from the archived planning set: none.

## Project Rules
- Backend owns provider configuration, prompt profiles, model API calls, material ingestion, and retrieval.
- Frontend consumes safe backend metadata through shared API clients and owns dashboard and Tutor workspace UX.
- Backend and frontend API contract changes should land together when one depends on the other.
- API keys stay in backend `.env` files only.
- The frontend default API target remains `http://localhost:8000`.

## Consolidated Milestones

### 1. Workspace Consolidation
- 2026-05-07: backend and frontend were copied into the monorepo layout under `H:\ai-tutor`.
- 2026-05-09: `H:\ai-tutor` became the canonical working tree; the old sibling folders became historical sources only.
- Shared repository structure was standardized around `backend/`, `frontend/`, `docs/`, and `scripts/`.

### 2. Verification Baseline
- Added explicit backend bootstrap coverage and startup-time database initialization.
- Added a monorepo CI workflow and restored local validation paths for both applications.
- Added a frontend test runner baseline so later Tutor and dashboard regressions could be locked down.

### 3. Cross-Project Product Flow
- Reworked the frontend from hash-based switching to routed pages.
- Split Tutor data loading into stable query keys and domain hooks.
- Unified Pomodoro ownership so dashboard and Tutor surfaces share one persisted timer state.
- Aligned the backend and frontend around application-scoped Tutor service lifecycles and safer error/reporting behavior.

### 4. Retrieval, Performance, and Hardening
- Replaced the recent-window RAG scan with a persistent VP-tree vector index while keeping user and `material_ids` filtering intact.
- Eliminated router future warnings and oversized frontend bundle warnings through lazy routes and math-specific chunk splitting.
- Completed the final MathMessage sanitization pass for KaTeX-safe markdown rendering.

## Validation Baseline
- Backend install: `cd backend; pip install -r requirements.txt`
- Backend run: `cd backend; python start.py`
- Backend tests: `cd backend; python -m unittest discover -s tests -v`
- Backend import validation: `cd backend; python -m compileall app tests`
- Frontend install: `cd frontend; npm install`
- Frontend run: `cd frontend; npm run dev`
- Frontend type check: `cd frontend; npm run type-check`
- Frontend lint: `cd frontend; npm run lint`
- Frontend build: `cd frontend; npm run build`

## Consolidated Sources
The following project-wide planning documents were consolidated into this file and then removed to avoid duplicate planning inputs:
- `PROGRESS.md`
- `docs/monorepo-migration.md`
