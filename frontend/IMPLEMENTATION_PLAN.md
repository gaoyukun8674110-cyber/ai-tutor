# Implementation Plan

## In Progress
- [x] P1 audit remediation
  - Notes: Implement shared API client, React Query dashboard cache, persisted settings, Tutor error banner, markdown sanitization, glass styles, and shadcn usage.

## Completed
- [x] Add real math rendering to Tutor chat
  - Notes: Markdown + KaTeX is wired into Tutor chat messages, common LaTeX delimiters are normalized, Tutor prompt rules require LaTeX, and smoke tests plus browser verification pass.
- [x] P2 audit remediation
  - Notes: Implemented TopNavbar non-dead actions, debounced history search hook, frontend API error classification, dead-code cleanup, and P2 regression checks.
- [x] T-8 theme system remediation
  - Notes: Added CSS variable-backed semantic tokens, expanded shared style helpers, and migrated Dashboard/Tutor hardcoded colors to tokens while preserving the existing visual direction.

## Backlog
- [ ] Add richer end-to-end UI coverage when the project has a first-class frontend test runner.
