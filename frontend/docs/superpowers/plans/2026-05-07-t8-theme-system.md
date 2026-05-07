# T-8 Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate frontend theme colors into semantic tokens and CSS variables.

**Architecture:** `index.css` owns light/dark variable values. `settings.tsx` exposes stable semantic token names to React. `glassStyles.ts` provides common style helpers, and dashboard/Tutor components consume those helpers instead of local hardcoded colors.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind v4, existing `useSettings` context.

---

### Task 1: Theme Token Layer

**Files:**
- Modify: `src/index.css`
- Modify: `src/utils/settings.tsx`
- Modify: `src/utils/glassStyles.ts`

- [ ] Add CSS variables under `body[data-theme='light']` and `body[data-theme='dark']`.
- [ ] Expand `ThemeTokens` with semantic surface, text, status, chart, action, and chat fields.
- [ ] Map `themeTokens` values to `var(--ai-*)` strings.
- [ ] Add style helpers for input fields, hoverable buttons, status panels, primary actions, and chat bubbles.

### Task 2: Dashboard Components

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TodayPlan.tsx`
- Modify: `src/components/StudyStats.tsx`
- Modify: `src/components/StudyCalendar.tsx`
- Modify: `src/components/PomodoroTimer.tsx`
- Modify: `src/components/TopNavbar.tsx`

- [ ] Replace local neutral text, field, hover, warning, success, and action colors with tokens.
- [ ] Keep dynamic Pomodoro mode colors centralized in `modeCopy`.
- [ ] Keep chart series colors centralized in `StudyStats`.

### Task 3: Tutor Components

**Files:**
- Modify: `src/components/TutorChatWorkspace.tsx`
- Modify: `src/components/tutor/TutorSidebar.tsx`
- Modify: `src/components/tutor/TutorComposer.tsx`
- Modify: `src/components/tutor/TutorMessageList.tsx`

- [ ] Pass theme tokens into Tutor child components where needed.
- [ ] Replace hardcoded chat surfaces, sidebar colors, inputs, hover states, and notices with semantic tokens/helpers.
- [ ] Keep existing layout and chat behavior unchanged.

### Task 4: Verification

**Files:**
- Modify if needed: `scripts/test-p2-audit-fixes.mjs`

- [ ] Run `npm run type-check`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `node --test scripts\test-p0-audit-fixes.mjs scripts\test-tutor-pomodoro-persistence.mjs scripts\test-p1-audit-fixes.mjs scripts\test-p2-audit-fixes.mjs`.
- [ ] Run `rg "#[0-9a-fA-F]{3,8}|rgba\(|linear-gradient" src/components src/utils` and document remaining intentional exceptions.
