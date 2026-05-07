import { useCallback, useEffect, useState, type ElementType } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Brain, Target, Zap } from 'lucide-react';
import { PomodoroTimer } from './components/PomodoroTimer';
import { StudyCalendar } from './components/StudyCalendar';
import { StudyStats } from './components/StudyStats';
import { TodayPlan } from './components/TodayPlan';
import { TopNavbar } from './components/TopNavbar';
import { TutorChatWorkspace } from './components/TutorChatWorkspace';
import { fetchDashboardSummary } from './utils/dashboardApi';
import { cardSurfaceStyle, primaryActionStyle } from './utils/glassStyles';
import { useSettings } from './utils/settings';
import { Button } from './components/ui/button';

interface StatCard {
  icon: ElementType;
  label: string;
  value: string;
}

const DASHBOARD_USER_ID = 'local';

function getInitialView(): 'dashboard' | 'tutor' {
  if (typeof window === 'undefined') return 'dashboard';
  return window.location.hash === '#tutor' ? 'tutor' : 'dashboard';
}

export default function App() {
  const { tokens, textStyle, t } = useSettings();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'dashboard' | 'tutor'>(() => getInitialView());
  const trainingMode = 'focus';
  const { data: dashboardSummary, error: dashboardError } = useQuery({
    queryKey: ['dashboard-summary', DASHBOARD_USER_ID],
    queryFn: ({ signal }) => fetchDashboardSummary(DASHBOARD_USER_ID, { signal }),
    enabled: activeView === 'dashboard',
  });

  const refreshDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard-summary', DASHBOARD_USER_ID] });
  }, [queryClient]);

  useEffect(() => {
    const syncViewFromUrl = () => {
      setActiveView(window.location.hash === '#tutor' ? 'tutor' : 'dashboard');
    };

    window.addEventListener('hashchange', syncViewFromUrl);
    window.addEventListener('popstate', syncViewFromUrl);

    return () => {
      window.removeEventListener('hashchange', syncViewFromUrl);
      window.removeEventListener('popstate', syncViewFromUrl);
    };
  }, []);

  const enterTutor = () => {
    window.history.pushState(null, '', '#tutor');
    setActiveView('tutor');
  };

  const exitTutor = () => {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    setActiveView('dashboard');
  };

  if (activeView === 'tutor') {
    return <TutorChatWorkspace trainingMode={trainingMode} onExit={exitTutor} onPomodoroLogged={refreshDashboard} />;
  }

  const todayStats = dashboardSummary?.today;
  const focusMinutes = todayStats?.focus_minutes ?? 0;
  const completedPomodoros = todayStats?.completed_pomodoros ?? 0;
  const completedTasks = todayStats?.completed_tasks ?? 0;
  const totalTasks = todayStats?.total_tasks ?? 0;
  const streakDays = dashboardSummary?.streak_days ?? 0;
  const studyHours = focusMinutes / 60;
  const stats: StatCard[] = [
    {
      icon: BookOpen,
      label: t('今日学习时长', "Today's study time"),
      value: studyHours > 0 ? t(`${studyHours.toFixed(1)} 小时`, `${studyHours.toFixed(1)} h`) : t('0 小时', '0 h'),
    },
    {
      icon: Target,
      label: t('完成任务', 'Tasks completed'),
      value: `${completedTasks} / ${totalTasks}`,
    },
    {
      icon: Brain,
      label: t('连续学习', 'Learning streak'),
      value: t(`${streakDays} 天`, `${streakDays} days`),
    },
  ];

  const cardStyle = cardSurfaceStyle(tokens);

  const renderStatCard = (item: StatCard) => {
    const Icon = item.icon;

    return (
      <div className="p-6 rounded-2xl shadow-lg min-h-[132px]" style={cardStyle}>
        <div className="flex h-full items-center justify-between gap-5">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: tokens.textSecondary }}>
              {item.label}
            </p>
            <p className="text-4xl font-bold tabular-nums" style={{ color: tokens.textSecondary }}>
              {item.value}
            </p>
          </div>
          <Icon className="h-10 w-10 shrink-0" style={{ color: tokens.textPrimary, opacity: 0.8 }} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ ...textStyle, color: tokens.textPrimary }}>
      <div className="fixed inset-0" style={{ background: tokens.pageGradient }} />
      <div className="fixed inset-0" style={{ background: tokens.overlayGradient }} />
      <TopNavbar />

      <div className="relative">
        <div className="relative max-w-screen-2xl mx-auto px-6 py-8">
          <div className="mb-8 text-center">
            <p className="text-lg" style={{ color: tokens.textSecondary }}>
              {dashboardError
                ? t(`后端数据暂时不可用：${dashboardError}`, `Backend data unavailable: ${dashboardError}`)
                : t('掌握你的学习节奏，成就更好的自己', 'Own your learning rhythm and become your best self')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <section className="space-y-6">
              {renderStatCard(stats[0])}
              <PomodoroTimer
                userId={DASHBOARD_USER_ID}
                persistedCompletedPomodoros={completedPomodoros}
                persistedFocusMinutes={focusMinutes}
                onPomodoroLogged={refreshDashboard}
              />
            </section>

            <section className="space-y-6">
              {renderStatCard(stats[1])}
              <TodayPlan
                userId={DASHBOARD_USER_ID}
                tasks={dashboardSummary?.tasks ?? []}
                onDataChange={refreshDashboard}
              />
            </section>

            <section className="space-y-6">
              {renderStatCard(stats[2])}
              <StudyStats
                focusMinutes={focusMinutes}
                completedPomodoros={completedPomodoros}
                completedTasks={completedTasks}
                totalTasks={totalTasks}
                weeklyData={dashboardSummary?.weekly_data ?? []}
              />
            </section>
          </div>

          <div className="mx-auto mt-6 max-w-7xl">
            <Button
              onClick={enterTutor}
              className="w-full rounded-2xl py-6 font-medium transition-all duration-200 shadow-lg text-white"
              style={primaryActionStyle(tokens)}
            >
              <Zap className="h-5 w-5" />
              {t('进入今日学习', "Enter today's study")}
            </Button>

            <div className="mt-6">
              <StudyCalendar events={dashboardSummary?.calendar_events ?? []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
