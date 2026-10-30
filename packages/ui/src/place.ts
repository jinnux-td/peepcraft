// Where a popover (menu, tooltip) goes next to its anchor, with no DOM: below or above, flipped when it would leave the viewport,
// then kept inside it. All boxes are in viewport pixels.
export interface Box { top: number; left: number; width: number; height: number }
export type Side = 'bottom' | 'top';
export type Align = 'start' | 'center';

export function place(anchor: Box, pop: { width: number; height: number }, view: { width: number; height: number }, side: Side = 'bottom', align: Align = 'start', gap = 4, margin = 8): { top: number; left: number; side: Side } {
  const below = anchor.top + anchor.height + gap, above = anchor.top - gap - pop.height;
  const fitsBelow = below + pop.height <= view.height - margin, fitsAbove = above >= margin;
  const chosen: Side = side === 'bottom' ? (fitsBelow || !fitsAbove ? 'bottom' : 'top') : (fitsAbove || !fitsBelow ? 'top' : 'bottom');
  let top = chosen === 'bottom' ? below : above;
  let left = align === 'center' ? anchor.left + (anchor.width - pop.width) / 2 : anchor.left;
  left = Math.min(Math.max(left, margin), Math.max(margin, view.width - margin - pop.width));
  top = Math.min(Math.max(top, margin), Math.max(margin, view.height - margin - pop.height));
  return { top: Math.round(top), left: Math.round(left), side: chosen };
}
