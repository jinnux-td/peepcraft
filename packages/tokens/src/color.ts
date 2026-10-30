// WCAG 2.2 contrast on hex colours, with alpha: a translucent colour is composited over what it sits on first.
export type Rgba = [r: number, g: number, b: number, a: number];

export function parseHex(hex: string): Rgba {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a hex colour: ${hex}`);
  let h = m[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
}

// `top` drawn over `bottom` (which must end up opaque).
export function over(top: string, ...below: string[]): Rgba {
  const base = below.length ? over(below[0], ...below.slice(1)) : parseHex('#ffffff');
  const [r, g, b, a] = parseHex(top);
  const mix = (t: number, u: number) => t * a + u * (1 - a);
  return [mix(r, base[0]), mix(g, base[1]), mix(b, base[2]), 1];
}

export function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
