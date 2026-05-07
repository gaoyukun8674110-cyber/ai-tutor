import { apiFetch, type ApiRequestOptions } from './apiClient';

export type DashboardTaskPriority = 'high' | 'medium' | 'low';

export interface DashboardTask {
  id: number;
  user_id: string;
  subject: string;
  task: string;
  duration: number;
  priority: DashboardTaskPriority;
  completed: boolean;
  scheduled_date: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardWeekDay {
  date: string;
  day: string;
  hours: number;
  tasks: number;
}

export interface DashboardCalendarEvent {
  id: string;
  type: 'task' | 'chat' | 'session' | string;
  date: string;
  time: string;
  title: string;
  subtitle: string;
  completed: boolean;
}

export interface DashboardSummary {
  user_id: string;
  today: {
    date: string;
    focus_minutes: number;
    completed_pomodoros: number;
    completed_tasks: number;
    total_tasks: number;
  };
  streak_days: number;
  tasks: DashboardTask[];
  weekly_data: DashboardWeekDay[];
  calendar_events: DashboardCalendarEvent[];
}

export async function fetchDashboardSummary(userId = 'local', options?: ApiRequestOptions): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/api/dashboard/summary?user_id=${encodeURIComponent(userId)}`, options);
}

export async function createDashboardTask(
  task: Pick<DashboardTask, 'subject' | 'task' | 'duration' | 'priority'> & {
    user_id?: string;
    scheduled_date?: string;
  },
): Promise<DashboardTask> {
  return apiFetch<DashboardTask>('/api/dashboard/tasks', {
    method: 'POST',
    body: JSON.stringify({ user_id: 'local', ...task }),
  });
}

export async function updateDashboardTask(
  taskId: number,
  update: Partial<Pick<DashboardTask, 'subject' | 'task' | 'duration' | 'priority' | 'completed' | 'scheduled_date'>> & {
    user_id?: string;
  },
): Promise<DashboardTask> {
  return apiFetch<DashboardTask>(`/api/dashboard/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: 'local', ...update }),
  });
}

export async function deleteDashboardTask(taskId: number, userId = 'local'): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/api/dashboard/tasks/${taskId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export async function logDashboardPomodoro(durationMinutes: number, mode = 'work', userId = 'local'): Promise<void> {
  await apiFetch('/api/dashboard/pomodoro', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      mode,
      duration_minutes: durationMinutes,
    }),
  });
}
