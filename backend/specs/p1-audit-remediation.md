# P1 Audit Remediation

## Scope
Implement the P1 findings from `C:\Users\gaoyu\Desktop\AI_TUTOR_AUDIT-1.md` across the backend and frontend projects.

## Acceptance Criteria
- Backend uploads reject oversized files and unsupported or mismatched file signatures before reading unbounded content into memory.
- Material ingestion creates a pending material record first, then fills embeddings in a background task.
- Material payloads and search responses expose `embedding_mode` so hash fallback is explicit.
- FastAPI responses include baseline security headers.
- LLM summary generation uses a single coherent prompt.
- Frontend API calls share one `apiClient`, support abort signals, and send the API key consistently.
- Dashboard data uses React Query caching/retry.
- Tutor metadata/material/history loading supports abort cleanup and Tutor send failures render as a UI error banner instead of an assistant message.
- Settings language and theme persist across refreshes.
- Markdown rendering uses `rehype-sanitize` and disallows unsafe `data:` image protocols.
- P1 UI/style cleanup uses shared glass style helpers and at least one real shadcn component in business UI.

