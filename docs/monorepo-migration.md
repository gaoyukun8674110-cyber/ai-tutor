# Monorepo Migration

Date: 2026-05-07

The backend and frontend projects were copied into a new monorepo at `H:\ai-tutor`.

## Source Directories

- Backend source: `H:\AI Tutor Backed`
- Frontend source: `H:\AI Tutor front end`

## Target Layout

```text
H:\ai-tutor\
  backend\
  frontend\
  docs\
  scripts\
  .gitignore
  README.md
  AGENTS.md
```

## Excluded Local Files

The migration intentionally excluded local-only and generated content:

- Nested `.git` directories
- Backend `.env`, `tutor.db`, `.venv`, `storage/`, Python caches, and logs
- Frontend `.env`, `node_modules`, `build`, `dist`, `.playwright-cli`, and `.learnings`

The original sibling directories were left in place.
