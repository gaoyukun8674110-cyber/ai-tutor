# Tutor Context Window

## Goal
Tutor chat should keep token usage bounded by prompting users to start new learning sessions and by compacting long conversations before sending them to the model.

## Policy
- 0-10 exchanges: normal conversation.
- 10-15 exchanges: frontend shows a suggestion to start a new learning chat.
- 15+ exchanges: backend generates a study summary.
- After a summary exists, model requests use:
  - the conversation summary,
  - the most recent 6 user/assistant exchanges,
  - the current user message,
  - future material context when textbook upload is implemented.

## Acceptance Criteria
- Frontend shows no warning before 10 exchanges.
- Frontend shows a warning after 10 exchanges.
- Frontend offers a new-chat action after 15 exchanges.
- Backend persists a summary after 15 exchanges.
- Backend compacts later model context instead of forwarding full history.
- New chats started after 15 exchanges can carry over the summary and recent context in `tutor_context`.

## Verification
- Backend unit tests cover compact context construction.
- Backend compile check passes.
- Frontend build passes.
