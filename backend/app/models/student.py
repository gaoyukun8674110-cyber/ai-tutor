"""学生相关数据模型"""

from sqlalchemy import JSON, Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Student(Base):
    """学生表"""

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        String(100), ForeignKey("users.username", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    username = Column(String(100), nullable=True)

    # 统计信息
    total_sessions = Column(Integer, default=0)  # 总训练次数
    total_questions = Column(Integer, default=0)  # 总做题数
    total_correct = Column(Integer, default=0)  # 总正确数

    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=False)

    # 关系
    masteries = relationship("StudentMastery", back_populates="student", cascade="all, delete-orphan")
    answers = relationship("StudentAnswer", back_populates="student", cascade="all, delete-orphan")


class StudentMastery(Base):
    """学生掌握度表"""

    __tablename__ = "student_masteries"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    skill_id = Column(String(100), nullable=False, index=True)  # 知识点ID
    skill_name = Column(String(200), nullable=False)

    # 掌握度数据
    mastery_score = Column(Float, default=0.0)  # 掌握度分数 (0-1 或 0-100)
    bkt_p_known = Column(Float, nullable=True)
    bkt_half_life = Column(Float, nullable=True)
    last_decay_at = Column(String(50), nullable=True)

    # 历史统计
    total_attempts = Column(Integer, default=0)  # 总尝试次数
    total_correct = Column(Integer, default=0)  # 总正确次数
    recent_correct_rate = Column(Float, default=0.0)  # 最近N次正确率
    average_time = Column(Float, default=0.0)  # 平均用时（秒）
    hint_usage_rate = Column(Float, default=0.0)  # hint 使用率

    # 时间戳
    last_practiced_at = Column(String(50), nullable=True)  # 上次练习时间
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=False)

    student = relationship("Student", back_populates="masteries")


class LearnerProfile(Base):
    """长期学习画像与主动复盘配置"""

    __tablename__ = "learner_profiles"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, unique=True, index=True)
    learning_style = Column(JSON, nullable=False, default=dict)
    review_enabled = Column(Boolean, default=True, nullable=False)
    review_frequency = Column(String(50), default="weekly", nullable=False)
    confidence_calibration = Column(JSON, nullable=False, default=dict)
    updated_at = Column(String(50), nullable=False)


class ReviewReport(Base):
    """周期性复盘报告"""

    __tablename__ = "review_reports"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    period = Column(String(100), nullable=False, index=True)
    report = Column(JSON, nullable=False, default=dict)
    created_at = Column(String(50), nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)


class StudentAnswer(Base):
    """学生答题记录表"""

    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("training_sessions.id"), nullable=True)

    # 答题信息
    answer = Column(Text, nullable=False)  # 学生答案
    is_correct = Column(Boolean, nullable=False)
    time_spent = Column(Float, nullable=False)  # 用时（秒）
    hint_count = Column(Integer, default=0)  # 使用 hint 次数
    error_reason = Column(String(200), nullable=True)  # 错因分类

    # LLM 诊断结果
    diagnosis = Column(Text, nullable=True)  # LLM 诊断文本

    # 时间戳
    created_at = Column(String(50), nullable=False)

    student = relationship("Student", back_populates="answers")
