import { describe, expect, it } from 'vitest';

import { deriveSelectedMaterialIds } from './materialSelection';

describe('material selection helpers', () => {
  it('selects every available material until the user has manually changed the selection', () => {
    expect(deriveSelectedMaterialIds([1, 2, 3], [1], false)).toEqual([1, 2, 3]);
  });

  it('preserves explicit user selection across material refreshes', () => {
    expect(deriveSelectedMaterialIds([1, 2, 3], [1], true)).toEqual([1]);
  });

  it('drops missing selections while preserving matching ids', () => {
    expect(deriveSelectedMaterialIds([1, 2, 3], [1, 4], true)).toEqual([1]);
  });
});
