import unittest
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.session import LearningGoal, SessionStatus, TrainingSession
from app.models.student import Student
from app.services.training_engine import TrainingEngine


class TrainingEngineTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def test_complete_session_updates_student_totals(self):
        db = self.SessionLocal()
        try:
            now = datetime(2026, 5, 1, 9, 0).isoformat()
            student = Student(
                user_id="learner-1",
                username="Learner",
                total_sessions=2,
                total_questions=10,
                total_correct=7,
                created_at=now,
                updated_at=now,
            )
            db.add(student)
            db.flush()
            session = TrainingSession(
                student_id=student.id,
                learning_goal=LearningGoal.CONSOLIDATION,
                duration_minutes=45,
                status=SessionStatus.IN_PROGRESS,
                total_questions=4,
                correct_count=3,
                session_plan={"phases": []},
                created_at=now,
                updated_at=now,
            )
            db.add(session)
            db.commit()

            completed = TrainingEngine(db).complete_session(session.id)

            db.refresh(student)
            self.assertEqual(completed.status, SessionStatus.COMPLETED)
            self.assertIsNotNone(completed.completed_at)
            self.assertEqual(student.total_sessions, 3)
            self.assertEqual(student.total_questions, 14)
            self.assertEqual(student.total_correct, 10)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
