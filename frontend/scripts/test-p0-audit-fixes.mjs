import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

assert.equal(packageJson.scripts['type-check'], 'tsc --noEmit');
assert.match(packageJson.scripts.lint, /eslint/);
assert.equal(packageJson.devDependencies.typescript !== undefined, true);
assert.equal(packageJson.devDependencies['@tailwindcss/vite'] !== undefined, true);

const viteConfig = readFileSync('vite.config.ts', 'utf8');
assert.doesNotMatch(viteConfig, /['"][^'"]+@\d+\.\d+\.\d+['"]\s*:/);
assert.match(viteConfig, /tailwindcss\(\)/);
assert.doesNotMatch(viteConfig, /port:\s*3000/);

const pomodoroSource = readFileSync('src/components/PomodoroTimer.tsx', 'utf8');
assert.match(pomodoroSource, /usePomodoroController/);
assert.doesNotMatch(pomodoroSource, /\},\s*\[isRunning,\s*timeLeft\]\);/);

const pomodoroProviderSource = readFileSync('src/features/pomodoro/PomodoroProvider.tsx', 'utf8');
assert.match(pomodoroProviderSource, /logDashboardPomodoro/);
assert.match(pomodoroProviderSource, /\},\s*\[state\.isRunning\]\);/);

const workspaceSource = readFileSync('src/components/TutorChatWorkspace.tsx', 'utf8');
assert.doesNotMatch(workspaceSource, /\[completedFocusRounds,\s*isRunning,\s*language,\s*onPomodoroLogged,\s*timerState\]/);
assert.match(workspaceSource, /TutorSidebar/);
assert.match(workspaceSource, /TutorMessageList/);
assert.match(workspaceSource, /TutorComposer/);
assert.match(workspaceSource, /useTutorTimer/);
assert.ok(workspaceSource.split('\n').length < 800);

const tutorTimerSource = readFileSync('src/components/tutor/useTutorTimer.ts', 'utf8');
assert.match(tutorTimerSource, /usePomodoroController/);

const mainPy = readFileSync('../backend/app/main.py', 'utf8');
assert.doesNotMatch(mainPy, /allow_origins=\["\*"\]/);
assert.match(mainPy, /build_cors_options\(settings\.DEBUG,\s*settings\.CORS_ORIGINS\)/);
assert.match(mainPy, /allow_origins=cors_allow_origins/);

const authDepsSource = readFileSync('../backend/app/api/deps.py', 'utf8');
assert.match(authDepsSource, /Header\(alias="X-API-Key"\)/);
