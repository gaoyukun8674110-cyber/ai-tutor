import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const tempDir = mkdtempSync(join(tmpdir(), 'ai-tutor-focus-status-'));
const bundlePath = join(tempDir, 'focusStatus.mjs');

try {
  await esbuild.build({
    entryPoints: ['src/utils/focusStatus.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundlePath,
    logLevel: 'silent',
  });

  const { resolveFocusStatus } = await import(pathToFileURL(bundlePath).href);

  assert.deepEqual(
    resolveFocusStatus({
      timerState: 'focus',
      isRunning: true,
      remainingSeconds: 2690,
      timerHasStarted: true,
      messageCount: 2,
      userExchangeCount: 1,
      selectedMaterialCount: 1,
      activeMaterialHitCount: 3,
      learningPhase: 'understanding',
      isSending: false,
    }),
    {
      focus: { zh: '专注中', en: 'Focusing', tone: 'active' },
      phase: { zh: '理解', en: 'Understanding' },
      detail: { zh: '剩余 44:50 · 1 轮对话 · 引用 3 段资料', en: '44:50 left · 1 exchange · 3 material hits' },
    },
  );

  assert.deepEqual(
    resolveFocusStatus({
      timerState: 'shortBreak',
      isRunning: false,
      remainingSeconds: 600,
      timerHasStarted: true,
      messageCount: 4,
      userExchangeCount: 2,
      selectedMaterialCount: 0,
      activeMaterialHitCount: 0,
      learningPhase: 'feynman',
      isSending: false,
    }).focus,
    { zh: '短休息', en: 'Short break', tone: 'rest' },
  );

  assert.deepEqual(
    resolveFocusStatus({
      timerState: 'focus',
      isRunning: false,
      remainingSeconds: 2700,
      timerHasStarted: false,
      messageCount: 0,
      userExchangeCount: 0,
      selectedMaterialCount: 2,
      activeMaterialHitCount: 0,
      learningPhase: 'general',
      isSending: false,
    }),
    {
      focus: { zh: '资料就绪', en: 'Materials ready', tone: 'ready' },
      phase: { zh: '待开始', en: 'Ready' },
      detail: { zh: '已选择 2 份资料', en: '2 materials selected' },
    },
  );

  assert.equal(
    resolveFocusStatus({
      timerState: 'focus',
      isRunning: false,
      remainingSeconds: 2500,
      timerHasStarted: true,
      messageCount: 6,
      userExchangeCount: 3,
      selectedMaterialCount: 1,
      activeMaterialHitCount: 0,
      learningPhase: 'planning',
      isSending: true,
    }).focus.zh,
    'AI 生成中',
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
