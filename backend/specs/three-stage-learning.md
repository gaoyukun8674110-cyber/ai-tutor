# Three-Stage Tutor Learning Method

## Goal
Make the Tutor use one default learning method instead of a loose collection of unrelated prompt profiles.

The default method has three stages:

1. Planning: when the student gives a learning goal, use the 80/20 rule to identify the smallest essential knowledge set.
2. Understanding: when the student is stuck on a concept, explain with a simple analogy and one contrast example.
3. Feynman check: when the student says "来费曼", ask as a beginner until the student can explain the concept clearly, then summarize missing key points.

## Behavior
- The backend exposes a `three_stage` prompt profile.
- `three_stage` is the default backend chat profile and the default frontend selected profile.
- The backend detects the current learning phase from the latest user message.
- Explicit phase cues in the latest message override any previous phase.
- If the latest message is vague, the previous phase can be carried forward.
- `/api/llm/chat` returns `learning_phase` so the UI can show the current stage.

## Context And Summary
- After 15 exchanges, the summary prompt must preserve learning state, not just chat text.
- Summary content should preserve:
  - current learning phase
  - learning goal
  - key 20% knowledge points
  - understood concepts
  - stuck concepts
  - missing points from Feynman practice
  - next step

## Acceptance Criteria
- Backend tests prove `three_stage` exists.
- Backend tests prove stage detection for planning, understanding, Feynman, and general messages.
- Frontend sends `three_stage` by default.
- Frontend shows the current phase label.
- Backend tests, backend compile, and frontend build pass.
