import { describe, expect, it } from 'vitest';
import { compareRuleLines } from '@/lib/tenant/ruleDiff';

describe('instruction line comparison', () => {
  it('keeps unchanged context and marks only replaced lines', () => {
    expect(
      compareRuleLines('Opening\nOld instruction\nClosing', 'Opening\nNew instruction\nClosing'),
    ).toEqual([
      { kind: 'same', text: 'Opening' },
      { kind: 'removed', text: 'Old instruction' },
      { kind: 'added', text: 'New instruction' },
      { kind: 'same', text: 'Closing' },
    ]);
  });
  it('represents an empty instruction as an actual addition or removal', () => {
    expect(compareRuleLines('', 'New')).toEqual([{ kind: 'added', text: 'New' }]);
    expect(compareRuleLines('Old', '')).toEqual([{ kind: 'removed', text: 'Old' }]);
  });
  it('preserves blank lines, duplicate instructions and both source documents', () => {
    const before = 'Same\n\nRepeat\nRepeat\nEnd\n';
    const after = 'Same\nAdded\n\nRepeat\nEnd\n';
    const lines = compareRuleLines(before, after);
    expect(
      lines
        .filter((line) => line.kind !== 'added')
        .map((line) => line.text)
        .join('\n'),
    ).toBe(before);
    expect(
      lines
        .filter((line) => line.kind !== 'removed')
        .map((line) => line.text)
        .join('\n'),
    ).toBe(after);
  });
  it('returns no changes for identical instructions including empty content', () => {
    expect(compareRuleLines('', '')).toEqual([]);
    expect(compareRuleLines('One\nTwo', 'One\nTwo').every((line) => line.kind === 'same')).toBe(
      true,
    );
  });
  it('bounds memory for large unrelated multiline instructions without dropping content', () => {
    const before = Array.from({ length: 1500 }, (_, i) => `a${i}`).join('\n');
    const after = Array.from({ length: 1500 }, (_, i) => `b${i}`).join('\n');
    const lines = compareRuleLines(before, after);
    expect(
      lines
        .filter((line) => line.kind !== 'added')
        .map((line) => line.text)
        .join('\n'),
    ).toBe(before);
    expect(
      lines
        .filter((line) => line.kind !== 'removed')
        .map((line) => line.text)
        .join('\n'),
    ).toBe(after);
  });
});
