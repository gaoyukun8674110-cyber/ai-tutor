import unittest
from datetime import date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.services.dashboard import DashboardService


class DashboardServiceTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def test_summary_uses_persisted_tasks_and_pomodoro_logs(self):
        db = self.SessionLocal()
        try:
            service = DashboardService(db)
            now = datetime(2026, 5, 1, 10, 30)

            task = service.create_task(
                user_id="demo",
                subject="Probability",
                task="Learn random variables",
                duration=50,
                priority="high",
                scheduled_date="2026-05-01",
                now=now,
            )
            service.update_task(task["id"], user_id="demo", completed=True, now=now)
            service.log_pomodoro(
                user_id="demo",
                mode="work",
                duration_minutes=25,
                completed_at=now,
            )

            summary = service.get_summary(user_id="demo", today=date(2026, 5, 1))

            self.assertEqual(summary["today"]["focus_minutes"], 25)
            self.assertEqual(summary["today"]["completed_pomodoros"], 1)
            self.assertEqual(summary["today"]["completed_tasks"], 1)
            self.assertEqual(summary["today"]["total_tasks"], 1)
            self.assertEqual(summary["streak_days"], 1)
            self.assertEqual(summary["tasks"][0]["task"], "Learn random variables")
            self.assertTrue(summary["tasks"][0]["completed"])
            self.assertEqual(summary["weekly_data"][-1]["tasks"], 1)
            self.assertEqual(summary["calendar_events"][0]["type"], "task")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
