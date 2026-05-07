import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import {
  createDashboardTask,
  deleteDashboardTask,
  updateDashboardTask,
  type DashboardTask,
} from '../utils/dashboardApi';
import { cardSurfaceStyle, inputSurfaceStyle, panelSurfaceStyle, statusPanelStyle } from '../utils/glassStyles';
import { useSettings } from '../utils/settings';

type Priority = 'high' | 'medium' | 'low';

interface TodayPlanStats {
  completedTasks: number;
  totalTasks: number;
  completedMinutes: number;
  totalMinutes: number;
}

interface TodayPlanProps {
  onStatsChange?: (stats: TodayPlanStats) => void;
  onDataChange?: () => void;
  tasks?: DashboardTask[];
  userId?: string;
}

const priorityStyles: Record<Priority, { label: { zh: string; en: string } }> = {
  high: { label: { zh: '高', en: 'High' } },
  medium: { label: { zh: '中', en: 'Medium' } },
  low: { label: { zh: '低', en: 'Low' } },
};

export function TodayPlan({ onStatsChange, onDataChange, tasks = [], userId = 'local' }: TodayPlanProps) {
  const [subject, setSubject] = useState('');
  const [taskText, setTaskText] = useState('');
  const [duration, setDuration] = useState(25);
  const [priority, setPriority] = useState<Priority>('medium');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language, tokens, t } = useSettings();

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed);
    return {
      completedTasks: completed.length,
      totalTasks: tasks.length,
      completedMinutes: completed.reduce((sum, task) => sum + task.duration, 0),
      totalMinutes: tasks.reduce((sum, task) => sum + task.duration, 0),
    };
  }, [tasks]);

  useEffect(() => {
    onStatsChange?.(stats);
  }, [stats, onStatsChange]);

  const progressPercentage = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const resetForm = () => {
    setSubject('');
    setTaskText('');
    setDuration(25);
    setPriority('medium');
    setEditingId(null);
  };

  const saveTask = async () => {
    const cleanTask = taskText.trim();
    const cleanSubject = subject.trim() || t('学习', 'Study');
    if (!cleanTask) return;

    setIsSaving(true);
    setError(null);
    try {
      if (editingId) {
        await updateDashboardTask(editingId, {
          user_id: userId,
          subject: cleanSubject,
          task: cleanTask,
          duration,
          priority,
        });
      } else {
        await createDashboardTask({
          user_id: userId,
          subject: cleanSubject,
          task: cleanTask,
          duration,
          priority,
        });
      }
      resetForm();
      onDataChange?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save task');
    } finally {
      setIsSaving(false);
    }
  };

  const editTask = (task: DashboardTask) => {
    setEditingId(task.id);
    setSubject(task.subject);
    setTaskText(task.task);
    setDuration(task.duration);
    setPriority(task.priority);
  };

  const toggleTask = async (task: DashboardTask) => {
    setError(null);
    try {
      await updateDashboardTask(task.id, { user_id: userId, completed: !task.completed });
      onDataChange?.();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to update task');
    }
  };

  const deleteTask = async (id: number) => {
    setError(null);
    try {
      await deleteDashboardTask(id, userId);
      if (editingId === id) resetForm();
      onDataChange?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete task');
    }
  };

  const cardStyle = cardSurfaceStyle(tokens);

  const panelStyle = panelSurfaceStyle(tokens);

  const fieldStyle = inputSurfaceStyle(tokens);

  const priorityColors: Record<Priority, string> = {
    high: tokens.danger,
    medium: tokens.accentPrimary,
    low: tokens.success,
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm transition-all duration-300 h-full" style={cardStyle}>
      <div className="p-6 border-b" style={panelStyle}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium" style={{ color: tokens.accentSecondary }}>
              {t('今日学习计划', "Today's plan")}
            </h2>
            <p className="text-sm mt-1" style={{ color: tokens.textSecondary }}>
              {t('按今天的安排添加任务。', 'Add tasks for today.')}
            </p>
          </div>
          <div className="text-sm font-medium tabular-nums" style={{ color: tokens.textPrimary }}>
            {stats.completedTasks}/{stats.totalTasks} {t('任务', 'tasks')}
          </div>
        </div>

        <div className="mt-4 w-full rounded-full h-3" style={{ background: tokens.surfaceAccent, border: tokens.borderSoft as string }}>
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%`, background: tokens.progressGradient }}
          />
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl p-4" style={panelStyle}>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder={t('科目', 'Subject')}
            className="rounded-xl px-3 py-2 text-sm outline-none placeholder:text-[var(--ai-placeholder-text)]"
            style={fieldStyle}
          />
          <input
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(event) => setDuration(Math.max(1, Number(event.target.value) || 1))}
            className="rounded-xl px-3 py-2 text-sm outline-none placeholder:text-[var(--ai-placeholder-text)]"
            style={fieldStyle}
          />
          <input
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
            placeholder={t('输入今日任务', "Enter today's task")}
            className="rounded-xl px-3 py-2 text-sm outline-none placeholder:text-[var(--ai-placeholder-text)] sm:col-span-2"
            style={fieldStyle}
          />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            className="rounded-xl px-3 py-2 text-sm outline-none"
            style={fieldStyle}
          >
            <option value="high">{priorityStyles.high.label[language]}</option>
            <option value="medium">{priorityStyles.medium.label[language]}</option>
            <option value="low">{priorityStyles.low.label[language]}</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={saveTask}
              disabled={!taskText.trim() || isSaving}
              className="h-10 flex-1 px-4 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: tokens.accentSecondary }}
            >
              {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? t('保存', 'Save') : t('添加', 'Add')}
            </button>
            {editingId && (
              <button onClick={resetForm} className="h-10 w-10 rounded-xl flex items-center justify-center" style={panelStyle}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl p-3 text-sm" style={statusPanelStyle(tokens, 'warning')}>
            {error}
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={panelStyle}>
            <p className="text-sm" style={{ color: tokens.textSecondary }}>
              {t('今天还没有任务', 'No tasks yet')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="group p-4 rounded-2xl border transition-all duration-200" style={panelStyle}>
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleTask(task)} className="mt-1" aria-label={t('切换完成状态', 'Toggle task')}>
                    {task.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={task.completed ? 'line-through text-green-600' : ''} style={{ color: task.completed ? undefined : tokens.textPrimary }}>
                        {task.subject}
                      </span>
                      <span
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: tokens.surface, border: tokens.borderSoft, color: priorityColors[task.priority] }}
                      >
                        {priorityStyles[task.priority].label[language]}
                      </span>
                    </div>
                    <p
                      className="text-sm mt-2"
                      style={{
                        color: task.completed ? tokens.success : tokens.textSecondary,
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}
                    >
                      {task.task}
                    </p>
                    <div className="flex items-center gap-1 text-xs mt-2" style={{ color: tokens.textSecondary }}>
                      <Clock className="h-3 w-3 text-blue-500" />
                      {task.duration}
                      {t('分钟', ' min')}
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editTask(task)} className="h-9 w-9 rounded-xl flex items-center justify-center" style={panelStyle}>
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="h-9 w-9 rounded-xl flex items-center justify-center" style={panelStyle}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl p-4" style={panelStyle}>
            <div className="text-green-600">{t('已完成', 'Done')}</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: tokens.textPrimary }}>
              {stats.completedMinutes}
              {t('分钟', ' min')}
            </div>
          </div>
          <div className="rounded-2xl p-4" style={panelStyle}>
            <div className="text-blue-600">{t('计划总计', 'Planned')}</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: tokens.textPrimary }}>
              {stats.totalMinutes}
              {t('分钟', ' min')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
