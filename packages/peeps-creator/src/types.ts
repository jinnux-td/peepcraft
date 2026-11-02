// The creator's own types: its tabs and themes. What the picture is made of (CreatorState, swatches, ...) is in @kit/peeps-engine.
import type { Slot } from '@kit/peeps'

export type ThemeId = 'sunny' | 'glass' | 'noir' | 'violet'

export type Tab = 'type' | Slot | 'extra' | 'figures' | 'scene'

export const themes: ReadonlyArray<{ id: ThemeId; label: string; dot: string }> = [
  { id: 'sunny', label: 'Sunny', dot: '#f7d56e' }, { id: 'glass', label: 'Glass', dot: '#3d6bff' },
  { id: 'noir', label: 'Noir', dot: '#f0a431' }, { id: 'violet', label: 'Violet', dot: '#8b6cff' },
]
