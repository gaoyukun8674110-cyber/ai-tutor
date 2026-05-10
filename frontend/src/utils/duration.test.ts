import { describe, expect, it } from 'vitest';

import { clampDurationMinutes } from './duration';

describe('duration helpers', () => {
  it('clamps duration values to the configured upper bound', () => {
    expect(clampDurationMinutes(99999)).toBe(600);
  });

  it('clamps duration values to the configured lower bound', () => {
    expect(clampDurationMinutes(0)).toBe(1);
  });
});
