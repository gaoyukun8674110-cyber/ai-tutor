# P1 Audit Remediation

## Scope
Implement the frontend P1 findings from `C:\Users\gaoyu\Desktop\AI_TUTOR_AUDIT-1.md`.

## Acceptance Criteria
- Shared API client owns base URL, `X-API-Key`, JSON parsing, upload parsing, and abort support.
- React Query caches dashboard summary and coordinates invalidation after dashboard mutations.
- Tutor chat displays service errors in a banner instead of adding fake assistant messages.
- Language/theme settings persist to localStorage.
- `MathMessage` sanitizes markdown HTML output and blocks `data:` image URLs.
- `StudyCalendar` no longer passes a CSS border shorthand into `borderColor`.
- Business UI uses shadcn components intentionally.
- Shared glass style helpers exist and are used by dashboard cards/panels.

