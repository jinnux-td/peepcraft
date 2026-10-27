import type { PeepType, Slot } from '@kit/peeps'

export type Parts = Partial<Record<Slot, string>>
export type ThemeId = 'sunny' | 'glass' | 'noir' | 'violet'

/** Everything the creator edits. `parts` holds only what the user chose; the rest falls back to the defaults of the type. */
export interface CreatorState {
  type: PeepType
  parts: Parts
  ink: string
  paper: string
  /** A colour, or "transparent". */
  bg: string
  scale: number
  /** Degrees. */
  rotate: number
  flip: boolean
  /** The id of a whole figure from @kit/transhumans; when set it is drawn instead of the peep. */
  figure: string | null
  /** Members of the scene, back to front. Empty until something is added from the Scene tab. */
  scene: SceneEntry[]
}

/** A copy of a peep or figure as it was when added to the scene, and where it stands. */
export interface SceneEntry extends Pick<CreatorState, 'type' | 'parts' | 'figure' | 'ink' | 'paper' | 'flip'> {
  /** Centre from the left, in scene units. */
  x: number
  /** 1 is the default size of its kind. */
  size: number
  /** Bottom of its measured outline, in its own canvas: its feet go on the ground line. */
  bottom: number
}

export type Tab = 'type' | Slot | 'figures' | 'scene'

export const initialState: CreatorState = { type: 'bust', parts: {}, ink: '#111111', paper: '#ffffff', bg: '#f7d56e', scale: 1, rotate: 0, flip: false, figure: null, scene: [] }

export const themes: ReadonlyArray<{ id: ThemeId; label: string; dot: string }> = [
  { id: 'sunny', label: 'Sunny', dot: '#f7d56e' }, { id: 'glass', label: 'Glass', dot: '#3d6bff' },
  { id: 'noir', label: 'Noir', dot: '#f0a431' }, { id: 'violet', label: 'Violet', dot: '#8b6cff' },
]

export const swatches = {
  bg: ['#f7d56e', '#ffb4a2', '#a8dadc', '#b8e0a5', '#cdb4ff', '#ffffff', '#1f2937', '#ff6b6b'],
  ink: ['#111111', '#1d3557', '#6b2d1a', '#2d6a4f', '#7b2cbf', '#ffffff'],
  paper: ['#ffffff', '#fde9d0', '#ffe066', '#cdeac0', '#d6e4ff', '#111111'],
} as const
