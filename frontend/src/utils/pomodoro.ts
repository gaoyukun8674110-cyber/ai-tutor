export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';
export type TutorTimerState = 'focus' | Exclude<PomodoroMode, 'work'>;

export interface TutorTimerCompletion {
  timerState: TutorTimerState;
  remainingSeconds: number;
  completedFocusRounds: number;
  focusLogMinutes: number;
}

export const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  work: 45,
  shortBreak: 10,
  longBreak: 20,
};

export function getBreakModeForCompletedFocusRound(completedFocusRounds: number): 'shortBreak' | 'longBreak' {
  return completedFocusRounds % 2 === 0 ? 'longBreak' : 'shortBreak';
}

export function getPomodoroDurationSeconds(mode: PomodoroMode): number {
  return POMODORO_DURATIONS[mode] * 60;
}

export function resolveTutorTimerCompletion(
  timerState: TutorTimerState,
  completedFocusRounds: number,
): TutorTimerCompletion {
  if (timerState === 'focus') {
    const nextFocusRounds = completedFocusRounds + 1;
    const nextBreakMode = getBreakModeForCompletedFocusRound(nextFocusRounds);

    return {
      timerState: nextBreakMode,
      remainingSeconds: getPomodoroDurationSeconds(nextBreakMode),
      completedFocusRounds: nextFocusRounds,
      focusLogMinutes: POMODORO_DURATIONS.work,
    };
  }

  return {
    timerState: 'focus',
    remainingSeconds: getPomodoroDurationSeconds('work'),
    completedFocusRounds,
    focusLogMinutes: 0,
  };
}
