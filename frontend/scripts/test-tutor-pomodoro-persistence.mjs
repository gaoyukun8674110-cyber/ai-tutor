import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = mkdtempSync(join(tmpdir(), 'ai-tutor-pomodoro-'));
const bundlePath = join(tempDir, 'pomodoro.mjs');

try {
  await esbuild.build({
    entryPoints: ['src/utils/pomodoro.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundlePath,
    logLevel: 'silent',
  });

  const { resolveTutorTimerCompletion } = await import(pathToFileURL(bundlePath).href);

  assert.deepEqual(resolveTutorTimerCompletion('focus', 0), {
    timerState: 'shortBreak',
    remainingSeconds: 600,
    completedFocusRounds: 1,
    focusLogMinutes: 45,
  });

  assert.deepEqual(resolveTutorTimerCompletion('shortBreak', 1), {
    timerState: 'focus',
    remainingSeconds: 2700,
    completedFocusRounds: 1,
    focusLogMinutes: 0,
  });

  const pomodoroProviderSource = readFileSync('src/features/pomodoro/PomodoroProvider.tsx', 'utf8');
  assert.match(pomodoroProviderSource, /logDashboardPomodoro/);
  assert.match(pomodoroProviderSource, /focusLogMinutes/);

  const dashboardPageSource = readFileSync('src/pages/DashboardPage.tsx', 'utf8');
  assert.match(dashboardPageSource, /persistedCompletedPomodoros/);
  assert.match(dashboardPageSource, /persistedFocusMinutes/);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
