import { useEffect, useRef, useState } from 'react';
import { Brain, Coffee, Minus, Pause, Play, Plus, RotateCcw, Settings, Target } from 'lucide-react';

import {
  POMODORO_DURATIONS,
  getBreakModeForCompletedFocusRound,
  type PomodoroMode,
} from '../utils/pomodoro';
import { logDashboardPomodoro } from '../utils/dashboardApi';
import { cardSurfaceStyle, panelSurfaceStyle } from '../utils/glassStyles';
import { useSettings } from '../utils/settings';

type TimerMode = PomodoroMode;

interface PomodoroStats {
  completedPomodoros: number;
  focusMinutes: number;
}

interface PomodoroTimerProps {
  onStatsChange?: (stats: PomodoroStats) => void;
  onPomodoroLogged?: () => void;
  userId?: string;
  persistedCompletedPomodoros?: number;
  persistedFocusMinutes?: number;
}

// Pomodoro mode colors are data-driven status accents; they stay centralized here rather than scattered inline.
const modeCopy = {
  work: {
    zh: '专注工作',
    en: 'Focus',
    icon: Brain,
    color: '#ef4444',
  },
  shortBreak: {
    zh: '短休息',
    en: 'Short break',
    icon: Coffee,
    color: '#10b981',
  },
  longBreak: {
    zh: '长休息',
    en: 'Long break',
    icon: Target,
    color: '#3b82f6',
  },
} satisfies Record<TimerMode, { zh: string; en: string; icon: typeof Brain; color: string }>;

export function PomodoroTimer({
  onStatsChange,
  onPomodoroLogged,
  userId = 'local',
  persistedCompletedPomodoros,
  persistedFocusMinutes,
}: PomodoroTimerProps) {
  const [workDuration, setWorkDuration] = useState(POMODORO_DURATIONS.work);
  const [shortBreakDuration, setShortBreakDuration] = useState(POMODORO_DURATIONS.shortBreak);
  const [longBreakDuration, setLongBreakDuration] = useState(POMODORO_DURATIONS.longBreak);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const { language, tokens, t } = useSettings();
  const latestStateRef = useRef({
    mode,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    completedPomodoros,
    userId,
    onPomodoroLogged,
    language,
  });
  const getCurrentDuration = () => {
    if (mode === 'work') return workDuration * 60;
    if (mode === 'shortBreak') return shortBreakDuration * 60;
    return longBreakDuration * 60;
  };

  useEffect(() => {
    latestStateRef.current = {
      mode,
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      completedPomodoros,
      userId,
      onPomodoroLogged,
      language,
    };
  }, [
    completedPomodoros,
    language,
    longBreakDuration,
    mode,
    onPomodoroLogged,
    shortBreakDuration,
    userId,
    workDuration,
  ]);

  useEffect(() => {
    onStatsChange?.({ completedPomodoros, focusMinutes });
  }, [completedPomodoros, focusMinutes, onStatsChange]);

  useEffect(() => {
    if (!isRunning) return undefined;

    intervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return handleTimerComplete();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      const currentDuration =
        mode === 'work' ? workDuration * 60 : mode === 'shortBreak' ? shortBreakDuration * 60 : longBreakDuration * 60;
      setTimeLeft(currentDuration);
    }
  }, [workDuration, shortBreakDuration, longBreakDuration, mode, isRunning]);

  const handleTimerComplete = (): number => {
    const currentState = latestStateRef.current;
    setIsRunning(false);

    if (currentState.mode === 'work') {
      const nextCompletedPomodoros = currentState.completedPomodoros + 1;
      const nextBreakMode = getBreakModeForCompletedFocusRound(nextCompletedPomodoros);
      const nextBreakDuration =
        nextBreakMode === 'shortBreak' ? currentState.shortBreakDuration : currentState.longBreakDuration;

      setCompletedPomodoros(nextCompletedPomodoros);
      setFocusMinutes((prev) => prev + currentState.workDuration);
      void logDashboardPomodoro(currentState.workDuration, 'work', currentState.userId)
        .then(() => currentState.onPomodoroLogged?.())
        .catch(() => {
          // Keep the timer usable even if the backend is temporarily unavailable.
        });
      setMode(nextBreakMode);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(currentState.language === 'zh' ? '番茄时钟' : 'Pomodoro', {
          body:
            currentState.language === 'zh'
              ? '专注时间结束，可以休息一下。'
              : 'Focus block finished. Take a break.',
        });
      }

      return nextBreakDuration * 60;
    }

    setMode('work');
    return currentState.workDuration * 60;
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getCurrentDuration());
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    const duration =
      newMode === 'work' ? workDuration : newMode === 'shortBreak' ? shortBreakDuration : longBreakDuration;
    setTimeLeft(duration * 60);
  };

  const adjustDuration = (type: TimerMode, increment: boolean) => {
    const adjustment = increment ? 1 : -1;

    if (type === 'work') {
      const nextDuration = Math.max(1, Math.min(60, workDuration + adjustment));
      setWorkDuration(nextDuration);
      if (mode === 'work' && !isRunning) setTimeLeft(nextDuration * 60);
      return;
    }

    if (type === 'shortBreak') {
      const nextDuration = Math.max(1, Math.min(30, shortBreakDuration + adjustment));
      setShortBreakDuration(nextDuration);
      if (mode === 'shortBreak' && !isRunning) setTimeLeft(nextDuration * 60);
      return;
    }

    const nextDuration = Math.max(1, Math.min(60, longBreakDuration + adjustment));
    setLongBreakDuration(nextDuration);
    if (mode === 'longBreak' && !isRunning) setTimeLeft(nextDuration * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentDuration = getCurrentDuration();
  const progress = currentDuration > 0 ? ((currentDuration - timeLeft) / currentDuration) * 100 : 0;
  const currentConfig = modeCopy[mode];
  const Icon = currentConfig.icon;
  const displayedCompletedPomodoros = persistedCompletedPomodoros ?? completedPomodoros;
  const displayedFocusMinutes = persistedFocusMinutes ?? focusMinutes;

  const cardStyle = cardSurfaceStyle(tokens);

  const headerStyle = {
    background: `linear-gradient(135deg, ${currentConfig.color}25, ${currentConfig.color}05)`,
    backdropFilter: 'blur(14px)',
    borderBottom: tokens.borderSoft,
  };

  const controlStyle = panelSurfaceStyle(tokens);

  return (
    <div className="h-full overflow-hidden rounded-2xl shadow-sm transition-all duration-300" style={cardStyle}>
      <div className="border-b p-6" style={headerStyle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-2" style={controlStyle}>
              <Icon className="h-5 w-5" style={{ color: currentConfig.color }} />
            </div>
            <h2 className="text-lg font-medium" style={{ color: currentConfig.color }}>
              {t('番茄时钟', 'Pomodoro')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium" style={controlStyle}>
              <span style={{ color: tokens.textSecondary }}>🍅</span>
              <span style={{ color: tokens.textPrimary }}>{displayedCompletedPomodoros}</span>
            </div>
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className="rounded-xl p-2 transition-all"
              style={controlStyle}
              aria-label={t('时长设置', 'Duration settings')}
            >
              <Settings className="h-4 w-4" style={{ color: tokens.textPrimary }} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {showSettings && (
          <div className="mb-6 space-y-3 rounded-2xl p-4" style={controlStyle}>
            <h3 className="mb-3 text-sm font-medium" style={{ color: tokens.textPrimary }}>
              {t('时长设置', 'Durations')}
            </h3>

            {(
              [
                { key: 'work', label: t('专注时长', 'Focus time') },
                { key: 'shortBreak', label: t('短休息', 'Short break') },
                { key: 'longBreak', label: t('长休息', 'Long break') },
              ] as { key: TimerMode; label: string }[]
            ).map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: tokens.textSecondary }}>
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustDuration(item.key, false)}
                    disabled={
                      (item.key === 'work' && workDuration <= 1) ||
                      (item.key === 'shortBreak' && shortBreakDuration <= 1) ||
                      (item.key === 'longBreak' && longBreakDuration <= 1)
                    }
                    className="rounded-lg p-1 disabled:cursor-not-allowed disabled:opacity-50"
                    style={controlStyle}
                    aria-label={t('减少时长', 'Decrease duration')}
                  >
                    <Minus className="h-4 w-4" style={{ color: tokens.textSecondary }} />
                  </button>
                  <span
                    className="w-16 rounded-lg py-1 text-center text-sm font-medium"
                    style={{ ...controlStyle, color: tokens.textPrimary }}
                  >
                    {item.key === 'work'
                      ? workDuration
                      : item.key === 'shortBreak'
                        ? shortBreakDuration
                        : longBreakDuration}
                    {t('分钟', 'm')}
                  </span>
                  <button
                    onClick={() => adjustDuration(item.key, true)}
                    disabled={
                      (item.key === 'work' && workDuration >= 60) ||
                      (item.key === 'shortBreak' && shortBreakDuration >= 30) ||
                      (item.key === 'longBreak' && longBreakDuration >= 60)
                    }
                    className="rounded-lg p-1 disabled:cursor-not-allowed disabled:opacity-50"
                    style={controlStyle}
                    aria-label={t('增加时长', 'Increase duration')}
                  >
                    <Plus className="h-4 w-4" style={{ color: tokens.textSecondary }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 flex gap-2">
          {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((item) => (
            <button
              key={item}
              onClick={() => switchMode(item)}
              className="flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all"
              style={{
                border: mode === item ? tokens.borderStrong : tokens.borderSoft,
                background: mode === item ? tokens.surface : tokens.surfaceMuted,
                color: mode === item ? modeCopy[item].color : tokens.textSecondary,
              }}
            >
              {modeCopy[item][language]}
            </button>
          ))}
        </div>

        <div className="relative mb-6">
          <div className="relative mx-auto h-48 w-48">
            <svg className="h-full w-full -rotate-90 transform">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-300/30"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="transition-all"
                style={{
                  transition: 'stroke-dashoffset 1s linear',
                  stroke: currentConfig.color,
                  filter: 'drop-shadow(0 0 8px currentColor)',
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold tabular-nums" style={{ color: tokens.textPrimary }}>
                {formatTime(timeLeft)}
              </div>
              <div className="mt-1 text-sm" style={{ color: tokens.textSecondary }}>
                {modeCopy[mode][language]}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={toggleTimer}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r py-3 font-medium text-white transition-all"
            style={{
              background: `linear-gradient(135deg, ${currentConfig.color}cc, ${currentConfig.color}99)`,
              border: tokens.borderSoft,
            }}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5" />
                {t('暂停', 'Pause')}
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                {t('开始', 'Start')}
              </>
            )}
          </button>
          <button onClick={resetTimer} className="rounded-xl px-4 py-3 transition-all" style={controlStyle}>
            <RotateCcw className="h-5 w-5" style={{ color: tokens.textSecondary }} />
          </button>
        </div>

        <div
          className="mt-4 rounded-2xl p-3"
          style={{
            ...controlStyle,
            background: `linear-gradient(135deg, ${currentConfig.color}15, ${currentConfig.color}05)`,
          }}
        >
          <p className="text-center text-sm tabular-nums" style={{ color: tokens.textSecondary }}>
            {t(`今日专注 ${displayedFocusMinutes} 分钟`, `${displayedFocusMinutes} focused minutes today`)}
          </p>
        </div>
      </div>
    </div>
  );
}
