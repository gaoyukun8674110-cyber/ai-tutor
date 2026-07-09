"""Math tool wrapping MathTools."""

from __future__ import annotations

from typing import Any

from app.utils.math_tools import MathTools


class MathTool:
    name = "math"

    def __init__(self, math_tools: MathTools | None = None):
        self.math_tools = math_tools or MathTools()

    def verify(self, student_answer: str, correct_answer: str) -> dict[str, Any]:
        return self.math_tools.verify_answer(student_answer, correct_answer)
