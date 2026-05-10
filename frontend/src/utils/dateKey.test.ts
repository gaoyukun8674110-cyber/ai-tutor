import { describe, expect, it } from 'vitest';

import { formatLocalDateKey, parseLocalDateKey } from './dateKey';

class FakeDate extends Date {
  override getFullYear() {
    return 2026;
  }

  override getMonth() {
    return 4;
  }

  override getDate() {
    return 9;
  }

  override toISOString() {
    return '2026-05-08T23:30:00.000Z';
  }
}

describe('dateKey helpers', () => {
  it('formats local date keys from local calendar parts instead of UTC ISO strings', () => {
    expect(formatLocalDateKey(new FakeDate())).toBe('2026-05-09');
  });

  it('parses local date keys into local Date objects', () => {
    const parsed = parseLocalDateKey('2026-05-09');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(9);
  });
});
