import { describe, expect, it } from 'vitest';

import { resolveFocusStatus } from './focusStatus';

describe('resolveFocusStatus', () => {
  it('returns readable Chinese copy for the initial Tutor state', () => {
    const status = resolveFocusStatus({
      timerState: 'focus',
      isRunning: false,
      remainingSeconds: 45 * 60,
      timerHasStarted: false,
      messageCount: 0,
      userExchangeCount: 0,
      selectedMaterialCount: 0,
      activeMaterialHitCount: 0,
      learningPhase: 'general',
      isSending: false,
    });

    expect(status.focus.zh).toBe('待开始');
    expect(status.phase.zh).toBe('待开始');
    expect(status.detail.zh).toBe('还没有开始本轮学习');
  });

  it('returns readable Chinese copy while Tutor is responding', () => {
    const status = resolveFocusStatus({
      timerState: 'focus',
      isRunning: false,
      remainingSeconds: 45 * 60,
      timerHasStarted: false,
      messageCount: 1,
      userExchangeCount: 1,
      selectedMaterialCount: 0,
      activeMaterialHitCount: 0,
      learningPhase: 'understanding',
      isSending: true,
    });

    expect(status.focus.zh).toBe('AI 生成中');
    expect(status.phase.zh).toBe('理解');
    expect(status.detail.zh).toContain('等待 Tutor 回复');
  });
});
