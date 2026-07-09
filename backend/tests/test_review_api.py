import unittest
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.review import router as review_router
from app.database import Base, get_db
from app.models.student import LearnerProfile, ReviewReport, Student, StudentMastery
from app.models.user import User
from app.services.review_scheduler import ReviewSchedulerService


def fake_user() -> User:
    return User(id=1, username="alice", email=None, is_active=True, created_at="now", updated_at="now")


class ReviewApiTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = self.SessionLocal()
        now = datetime(2026, 7, 8, 9, 0).isoformat()
        self.db.add(User(username="alice", password_hash="x", is_active=True, created_at=now, updated_at=now))
        self.db.add(User(username="bob", password_hash="x", is_active=True, created_at=now, updated_at=now))
        self.alice = Student(user_id="alice", username="Alice", created_at=now, updated_at=now)
        self.bob = Student(user_id="bob", username="Bob", created_at=now, updated_at=now)
        self.db.add_all([self.alice, self.bob])
        self.db.flush()
        self.db.add(
            StudentMastery(
                student_id=self.alice.id,
                skill_id="probability",
                skill_name="Probability",
                mastery_score=0.2,
                bkt_p_known=0.2,
                bkt_half_life=3,
                created_at=now,
                updated_at=now,
                last_practiced_at=now,
            )
        )
        self.db.commit()

        app = FastAPI()
        app.dependency_overrides[get_current_user] = fake_user

        def override_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        app.include_router(review_router)
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()

    def test_manual_review_run_creates_report_with_weak_skill(self):
        response = self.client.post("/api/review/run")

        self.assertEqual(response.status_code, 200)
        report = response.json()["report"]["report"]
        self.assertEqual(report["weak_skills"][0]["skill_id"], "probability")

    def test_scheduler_respects_disabled_review_profile(self):
        self.db.add(
            LearnerProfile(
                student_id=self.alice.id,
                learning_style={},
                review_enabled=False,
                review_frequency="weekly",
                confidence_calibration={},
                updated_at=datetime.now().isoformat(),
            )
        )
        self.db.commit()

        service = ReviewSchedulerService(self.db)
        report = service.run_for_student(self.alice.id, user_id="alice", force=False)

        self.assertIsNone(report)

    def test_reports_are_scoped_to_current_user_and_acknowledged(self):
        now = datetime(2026, 7, 8, 9, 0).isoformat()
        alice_report = ReviewReport(
            student_id=self.alice.id,
            period="2026-W27",
            report={"summary": "alice"},
            created_at=now,
            acknowledged=False,
        )
        bob_report = ReviewReport(
            student_id=self.bob.id,
            period="2026-W27",
            report={"summary": "bob"},
            created_at=now,
            acknowledged=False,
        )
        self.db.add_all([alice_report, bob_report])
        self.db.commit()

        list_response = self.client.get("/api/review/reports")
        summaries = [item["report"]["summary"] for item in list_response.json()["reports"]]
        self.assertIn("alice", summaries)
        self.assertNotIn("bob", summaries)

        ack_response = self.client.post(f"/api/review/reports/{alice_report.id}/ack")
        self.assertEqual(ack_response.status_code, 200)
        self.assertTrue(ack_response.json()["report"]["acknowledged"])

        bob_ack = self.client.post(f"/api/review/reports/{bob_report.id}/ack")
        self.assertEqual(bob_ack.status_code, 404)


if __name__ == "__main__":
    unittest.main()
