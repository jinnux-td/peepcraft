// Keyboard decisions for composite widgets (tabs, segmented control, menu), with no DOM: which item a key moves to, and typeahead.
export type Orientation = 'horizontal' | 'vertical' | 'both';

// The index a key moves focus to among `count` items, skipping disabled ones; null when the key is not a move.
// Arrows wrap around. Home and End go to the first and last enabled item.
export function step(from: number, key: string, count: number, orientation: Orientation = 'horizontal', disabled: (i: number) => boolean = () => false): number | null {
  const next = ['ArrowRight', 'ArrowDown'].filter((k) => orientation === 'both' || (orientation === 'horizontal' ? k === 'ArrowRight' : k === 'ArrowDown'));
  const prev = ['ArrowLeft', 'ArrowUp'].filter((k) => orientation === 'both' || (orientation === 'horizontal' ? k === 'ArrowLeft' : k === 'ArrowUp'));
  const enabled = [...Array(count).keys()].filter((i) => !disabled(i));
  if (!enabled.length) return null;
  if (key === 'Home') return enabled[0];
  if (key === 'End') return enabled[enabled.length - 1];
  const dir = next.includes(key) ? 1 : prev.includes(key) ? -1 : 0;
  if (!dir) return null;
  for (let n = 1; n <= count; n++) {
    const i = (((from + dir * n) % count) + count) % count;
    if (!disabled(i)) return i;
  }
  return null;
}

// Typeahead: the first item after `from` (wrapping) whose label starts with `query`, case-insensitive; null when none does.
// A query of one repeated letter cycles through the items starting with that letter.
export function typeahead(labels: string[], from: number, query: string): number | null {
  const q = query.toLowerCase(), single = [...q].every((c) => c === q[0]) ? q[0] : q;
  const n = labels.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n, l = labels[i].trim().toLowerCase();
    if (l.startsWith(q) || (single !== q && l.startsWith(single))) return i;
  }
  return null;
}
