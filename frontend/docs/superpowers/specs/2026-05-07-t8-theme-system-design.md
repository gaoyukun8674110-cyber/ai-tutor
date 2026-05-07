# T-8 Theme System Design

## Goal
Resolve the P2 T-8 audit finding by consolidating scattered frontend colors into semantic theme tokens without redesigning the application.

## Scope
Change the frontend theme layer only. The backend, API behavior, timer logic, React Query data flow, routing, RAG, auth, and Tailwind/Vite build chain stay unchanged.

## Design
Use `src/index.css` as the source of light/dark CSS variables under `body[data-theme='light']` and `body[data-theme='dark']`. Keep `src/utils/settings.tsx` as the React-facing API, but expand `ThemeTokens` so components consume semantic names such as `textMuted`, `inputSurface`, `hoverSurface`, `warningSoft`, `chatUserBubble`, and `chartGrid`.

`src/utils/glassStyles.ts` will expose reusable helpers for common surfaces, input fields, action buttons, status panels, and chat bubbles. Component edits should replace hardcoded colors in the main dashboard and Tutor flow with these tokens and helpers. Dynamic values that are inherently data-driven, such as Pomodoro mode colors and chart gradients, may remain if they are centralized or documented as intentional exceptions.

## Acceptance
Frontend `type-check`, `lint`, `build`, and existing P0/P1/P2 regression scripts must pass. A grep for hardcoded colors in `src/components` and `src/utils` should show only justified exceptions: dynamic Pomodoro mode colors, chart series colors, SVG/Tailwind utility state classes, markdown/code styling, or third-party component classes.
