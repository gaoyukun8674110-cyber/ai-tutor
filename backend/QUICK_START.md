# 快速开始指南

## 1. 环境准备

确保已安装 Python 3.8+

## 2. 安装依赖

```bash
pip install -r requirements.txt
```

## 3. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 必须配置（如果使用 LLM 功能）
OPENAI_API_KEY=your_api_key_here

# 可选配置
DATABASE_URL=sqlite:///./tutor.db
DEBUG=True
```

## 4. 启动服务

```bash
python start.py
```

服务将在 `http://localhost:8000` 启动

## 5. 测试 API

访问 `http://localhost:8000/docs` 查看交互式 API 文档

## 6. 典型使用流程

### 6.1 创建题目

```bash
POST /api/questions/
{
  "content": "计算 2 + 2 = ?",
  "correct_answer": "4",
  "standard_solution": "2 + 2 = 4",
  "question_type": "choice",
  "difficulty": "easy",
  "skills": [
    {"skill_id": "basic_arithmetic", "skill_name": "基础运算", "weight": 1.0}
  ]
}
```

### 6.2 创建训练 Session

```bash
POST /api/training/sessions
{
  "user_id": "user123",
  "target_skills": ["basic_arithmetic"],
  "learning_goal": "consolidation",
  "duration_minutes": 25
}
```

### 6.3 开始训练

```bash
POST /api/training/sessions/{session_id}/start
```

### 6.4 获取题目

```bash
GET /api/training/sessions/{session_id}/next
```

### 6.5 提交答案

```bash
POST /api/training/sessions/{session_id}/answer?question_id=1
{
  "answer": "4",
  "time_spent": 5.2,
  "hint_count": 0
}
```

### 6.6 获取掌握度

```bash
GET /api/student/{user_id}/mastery
```

## 7. 核心概念

### 7.1 知识点（Skill）
每个题目关联 1-3 个知识点，系统会追踪学生对每个知识点的掌握度。

### 7.2 掌握度（Mastery）
0-1 之间的分数，表示学生对某个知识点的掌握程度。

### 7.3 Session
一次训练会话，通常对应一个番茄钟（25 分钟）。

### 7.4 训练引擎策略
- 连续做对 3 题 → 提高难度
- 连续做错 3 题 → 降低难度
- Session 快结束时 → 插入复习题

## 8. 扩展开发

### 8.1 添加新题型
在 `app/models/question.py` 的 `QuestionType` 枚举中添加

### 8.2 自定义掌握度算法
修改 `app/services/student_model.py` 的 `_calculate_mastery_score` 方法

### 8.3 添加新的 LLM Agent
在 `app/services/llm_service.py` 的 `agent_prompts` 中添加新角色

## 9. 数据库迁移

```bash
# 创建迁移
alembic revision --autogenerate -m "描述"

# 应用迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

