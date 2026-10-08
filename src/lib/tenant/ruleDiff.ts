export type RuleDiffLine = { kind: 'same' | 'removed' | 'added'; text: string };

/** Line comparison with bounded memory for the editor's 10,000-character fields. */
export function compareRuleLines(previous: string, current: string): RuleDiffLine[] {
  const before = previous ? previous.split('\n') : [];
  const after = current ? current.split('\n') : [];
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix])
    prefix++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > prefix && endAfter > prefix && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  const result: RuleDiffLine[] = before.slice(0, prefix).map((text) => ({ kind: 'same', text }));
  const removed = before.slice(prefix, endBefore);
  const added = after.slice(prefix, endAfter);
  // Large unrelated documents remain a truthful remove/add comparison without quadratic allocation.
  if ((removed.length + 1) * (added.length + 1) > 250000) {
    result.push(...removed.map((text) => ({ kind: 'removed' as const, text })));
    result.push(...added.map((text) => ({ kind: 'added' as const, text })));
  } else {
    const width = added.length + 1;
    const lengths = new Uint16Array((removed.length + 1) * width);
    for (let i = removed.length - 1; i >= 0; i--)
      for (let j = added.length - 1; j >= 0; j--)
        lengths[i * width + j] =
          removed[i] === added[j]
            ? 1 + lengths[(i + 1) * width + j + 1]!
            : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!);
    let i = 0,
      j = 0;
    while (i < removed.length || j < added.length) {
      if (i < removed.length && j < added.length && removed[i] === added[j]) {
        result.push({ kind: 'same', text: removed[i++]! });
        j++;
      } else if (
        i < removed.length &&
        (j === added.length || lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!)
      )
        result.push({ kind: 'removed', text: removed[i++]! });
      else result.push({ kind: 'added', text: added[j++]! });
    }
  }
  result.push(...before.slice(endBefore).map((text) => ({ kind: 'same' as const, text })));
  return result;
}
