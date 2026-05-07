# Tutor Conversation History

## Goal
Tutor chat conversations must be persisted and shown in the Tutor workspace sidebar as real past study sessions.

## Acceptance Criteria
- Sending a Tutor chat message creates a persisted conversation when no conversation is active.
- Continuing the same chat appends the new user and assistant messages to the same conversation.
- Refreshing or re-entering the Tutor workspace loads real persisted conversations into the sidebar.
- Clicking a sidebar history item restores its messages in the chat area.
- Deleting a sidebar history item deletes it from the backend database.
- Empty projects show no fake history records.

## Data Model
- `tutor_conversations`: one row per Tutor chat.
- `tutor_conversation_messages`: ordered user/assistant messages for each chat.

## API
- `GET /api/llm/conversations`
- `GET /api/llm/conversations/{conversation_id}`
- `DELETE /api/llm/conversations/{conversation_id}`
- `POST /api/llm/chat` accepts optional `conversation_id` and returns `conversation_id`.

## Verification
- Backend service unit test covers save, list, load, and delete.
- Backend compile check must pass.
- Frontend production build must pass.
