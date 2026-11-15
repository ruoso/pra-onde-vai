import { describe, it, expect } from 'vitest';
import { roundHalfEven, median } from './numbers.js';

describe('rounding as the research scripts do', () => {
  it('goes to the even neighbour on a tie, like Python', () => {
    expect([0.5, 1.5, 2.5, 3.5, -2.5].map((x) => roundHalfEven(x))).toEqual([0, 2, 2, 4, -2]);
    expect(roundHalfEven(2.51)).toBe(3);
    expect(roundHalfEven(12.25, 1)).toBe(12.2);
  });
  it('takes the median at index ⌊n/2⌋ of the sorted values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(3);
  });
});
