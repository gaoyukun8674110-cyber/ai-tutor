import { useEffect, useRef, useState } from 'react';

import { logDashboardPomodoro } from '../../utils/dashboardApi';
import { getPomodoroDurationSeconds, resolveTutorTimerCompletion } from '../../utils/pomodoro';
import type { Language } from '../../utils/settings';
import type { TimerState } from './types';

interface UseTutorTimerOptions {
  language: Language;
  onPomodoroLogged?: () => void;
  onTimerMessage: (content: string) => void;
}

export function useTutorTimer({ language, onPomodoroLogged, onTimerMessage }: UseTutorTimerOptions) {
  const initialFocusSeconds = getPomodoroDurationSeconds('work');
  const [remainingSeconds, setRemainingSeconds] = useState(initialFocusSeconds);
  const [timerState, setTimerState] = useState<TimerState>('focus');
  const [isRunning, setIsRunning] = useState(false);
  const [timerHasStarted, setTimerHasStarted] = useState(false);
  const [completedFocusRounds, setCompletedFocusRounds] = useState(0);
  const timerStateRef = useRef({
    timerState,
    completedFocusRounds,
    language,
    onPomodoroLogged,
    onTimerMessage,
  });

  useEffect(() => {
    timerStateRef.current = {
      timerState,
      completedFocusRounds,
      language,
      onPomodoroLogged,
      onTimerMessage,
    };
  }, [completedFocusRounds, language, onPomodoroLogged, onTimerMessage, timerState]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current > 1) return current - 1;

        window.clearInterval(timer);
        setIsRunning(false);

        const currentTimerState = timerStateRef.current;
        const completion = resolveTutorTimerCompletion(
          currentTimerState.timerState,
          currentTimerState.completedFocusRounds,
        );

        if (currentTimerState.timerState === 'focus') {
          const breakMinutes = Math.round(completion.remainingSeconds / 60);

          setCompletedFocusRounds(completion.completedFocusRounds);
          setTimerState(completion.timerState);
          if (completion.focusLogMinutes > 0) {
            void logDashboardPomodoro(completion.focusLogMinutes, 'work', 'local')
              .then(() => currentTimerState.onPomodoroLogged?.())
              .catch(() => {
                // Keep the Tutor timer usable even if dashboard persistence is unavailable.
              });
          }
          currentTimerState.onTimerMessage(
            currentTimerState.language === 'zh'
              ? `本轮专注结束。休息 ${breakMinutes} 分钟，然后继续下一轮。`
              : `Focus round complete. Take a ${breakMinutes}-minute break, then continue.`,
          );
          return completion.remainingSeconds;
        }

        setTimerState(completion.timerState);
        return completion.remainingSeconds;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  const resetTimer = () => {
    setTimerState('focus');
    setRemainingSeconds(initialFocusSeconds);
    setIsRunning(false);
    setTimerHasStarted(false);
    setCompletedFocusRounds(0);
  };

  const startNextRound = () => {
    setTimerState('focus');
    setRemainingSeconds(initialFocusSeconds);
    setTimerHasStarted(true);
    setIsRunning(true);
  };

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }

    setTimerHasStarted(true);
    setIsRunning(true);
  };

  return {
    remainingSeconds,
    timerState,
    isRunning,
    timerHasStarted,
    completedFocusRounds,
    resetTimer,
    startNextRound,
    toggleTimer,
  };
}
