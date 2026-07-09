"""Active review report API."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.student import ReviewReport, Student
from app.models.user import User
from app.services.review_scheduler import ReviewSchedulerService
from app.services.student_model import StudentModelService

router = APIRouter(prefix="/api/review", tags=["review"], dependencies=[Depends(get_current_user)])


def _report_payload(report: ReviewReport) -> dict[str, Any]:
    return {
        "id": report.id,
        "student_id": report.student_id,
        "period": report.period,
        "report": report.report,
        "created_at": report.created_at,
        "acknowledged": report.acknowledged,
    }


def _current_student(db: Session, current_user: User) -> Student:
    return StudentModelService(db).get_or_create_student(current_user.username)


def _require_report(report_id: int, db: Session, current_user: User) -> ReviewReport:
    report = (
        db.query(ReviewReport)
        .join(Student, Student.id == ReviewReport.student_id)
        .filter(ReviewReport.id == report_id, Student.user_id == current_user.username)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Review report not found")
    return report


@router.get("/reports", response_model=dict)
def list_review_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = _current_student(db, current_user)
    reports = (
        db.query(ReviewReport)
        .filter(ReviewReport.student_id == student.id)
        .order_by(ReviewReport.created_at.desc())
        .all()
    )
    return {"reports": [_report_payload(report) for report in reports]}


@router.post("/run", response_model=dict)
def run_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    student = _current_student(db, current_user)
    service = ReviewSchedulerService(db)
    report = service.run_for_student(
        student.id,
        user_id=current_user.username,
        force=True,
    )
    if not report:
        raise HTTPException(status_code=400, detail="Review report could not be generated")
    return {"report": _report_payload(report)}


@router.post("/reports/{report_id}/ack", response_model=dict)
def acknowledge_review_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _require_report(report_id, db, current_user)
    report.acknowledged = True
    db.commit()
    db.refresh(report)
    return {"report": _report_payload(report)}
