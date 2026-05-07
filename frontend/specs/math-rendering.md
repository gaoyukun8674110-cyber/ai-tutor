# Math Rendering

## Goal
AI Tutor chat messages render real mathematical notation for probability/statistics tutoring, including fractions, exponents, roots, sums, and block equations.

## Acceptance Criteria
- Tutor messages support Markdown plus LaTeX math.
- Inline math works with `$...$` and `\(...\)`.
- Block math works with `$$...$$` and `\[...\]`.
- Rendered math uses KaTeX-quality typography instead of plain text.
- Existing chat layout, message bubbles, and Chinese text rendering remain readable.
- Backend Tutor prompts instruct models to output LaTeX for formulas.

## Validation
- `node --test scripts\test-math-content.mjs`
- `npm.cmd run build`
- Browser check: a Tutor message with `\frac`, exponent, and `\sqrt` renders as KaTeX elements.
