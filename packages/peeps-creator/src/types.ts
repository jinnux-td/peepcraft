import type { PartColors, PeepType, Slot } from '@kit/peeps'

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
  /** An extra the peep wears (a speech bubble): an id of the extras of @kit/things, in its own line and fill colours. */
  extra?: { id: string; ink: string; paper: string }
  /** Ink and paper of single parts of the peep (hair, clothes, ...), over `ink` and `paper`. */
  partColors: PartColors
  /** One colour for all the skin (face, neck, hands); without it each item's skin keeps its own. */
  skin?: string
  /** Members of the scene, back to front. Empty until something is added from the Scene tab. */
  scene: SceneEntry[]
  /** The scene's picture: its shape, and how close it is (2 shows everyone twice as big). */
  frame: { ratio: Ratio; zoom: number }
  /** Contrast: black lines on white only, as the pack draws them; the colours of items, skin and picks are kept for when it is off. */
  mono?: boolean
  /** What "Shuffle all" leaves alone: the background, the type, a part, the extra, or the skin. */
  locked?: readonly Lockable[]
}

/** What can be locked against "Shuffle all". */
export type Lockable = 'bg' | 'type' | Slot | 'extra' | 'skin'

/** Width to height of the scene. */
export const RATIOS = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '3:4': 3 / 4, '9:16': 9 / 16 } as const
export type Ratio = keyof typeof RATIOS

/** A copy of a peep or figure as it was when added to the scene, and where it stands. */
export interface SceneEntry extends Pick<CreatorState, 'type' | 'parts' | 'figure' | 'ink' | 'paper' | 'flip'>, Partial<Pick<CreatorState, 'partColors' | 'skin' | 'mono' | 'extra'>> {
  /** Centre from the left, in scene units. */
  x: number
  /** 1 is the default size of its kind. */
  size: number
  /** Bottom of its measured outline, in its own canvas: its feet go on the ground line. */
  bottom: number
  /** Height above the ground, in scene units: a mug on a table. */
  lift?: number
  /** A thing of @kit/things, or an uploaded picture, drawn instead of the peep or figure. */
  thing?: string
  upload?: Upload
  /** Colours of a thing's named parts (its `slots`); a part left out takes `paper`. */
  colors?: Partial<Record<string, string>>
}

/** A picture the person uploaded, kept in this browser only. `width` and `height` are its size in the scene at size 1. */
export interface Upload { id: string; name: string; href: string; width: number; height: number }

export type Tab = 'type' | Slot | 'extra' | 'figures' | 'scene'

/** The skin a peep starts with: the one of the Figma symbols. */
export const SKIN = '#d08b5b'

export const initialState: CreatorState = { type: 'bust', parts: {}, ink: '#111111', paper: '#ffffff', skin: SKIN, bg: '#f7d56e', scale: 1, rotate: 0, flip: false, figure: null, partColors: {}, scene: [], frame: { ratio: '1:1', zoom: 1 },
  // Shuffle all keeps the type, and adds no mask or extra, until they are unlocked.
  locked: ['type', 'mask', 'extra'] }

export const themes: ReadonlyArray<{ id: ThemeId; label: string; dot: string }> = [
  { id: 'sunny', label: 'Sunny', dot: '#f7d56e' }, { id: 'glass', label: 'Glass', dot: '#3d6bff' },
  { id: 'noir', label: 'Noir', dot: '#f0a431' }, { id: 'violet', label: 'Violet', dot: '#8b6cff' },
]

export const swatches = {
  bg: ['#f7d56e', '#ffb4a2', '#a8dadc', '#b8e0a5', '#cdb4ff', '#ffffff', '#1f2937', '#ff6b6b'],
  ink: ['#111111', '#1d3557', '#6b2d1a', '#2d6a4f', '#7b2cbf', '#ffffff'],
  paper: ['#ffffff', '#fde9d0', '#ffe066', '#cdeac0', '#d6e4ff', '#111111'],
  /** The full set behind "more colours": greys, then reds to violets, blues, greens to oranges, seven to a row. */
  all: [
    '#000000', '#545454', '#737373', '#a6a6a6', '#d9d9d9', '#f2f2f2', '#ffffff',
    '#ff3131', '#ff5757', '#ff66c4', '#e2a9f1', '#cb6ce6', '#8c52ff', '#5e17eb',
    '#0097b2', '#0cc0df', '#5ce1e6', '#38b6ff', '#5271ff', '#004aad', '#1800ad',
    '#00bf63', '#7ed957', '#c1ff72', '#ffde59', '#ffbd59', '#ff914d', '#ff751f',
  ],
  /** Skin tones for a skin, light to dark; any other colour is under the wheel and "more colours". */
  skin: ['#ffffff', '#ffe2cb', '#ffdbbe', '#ffdbac', '#ffcf9e', '#f1c27d', '#e0ac69', '#d08b5b', '#c68642', '#987161', '#8d5524', '#5c3a21', '#4f3e35'],
  hair: ['#111111', '#3b2219', '#6b2d1a', '#a55728', '#d6b370', '#e8e1d1', '#b33a3a'],
  clothes: ['#ffffff', '#e63946', '#ffe066', '#52b788', '#38b6ff', '#1d3557', '#8c52ff'],
  /** For the named parts of a thing: leaves, wood, cushions. */
  parts: ['#ffffff', '#ffe066', '#ff8fa3', '#52b788', '#2d6a4f', '#c9773e', '#7b4a2a'],
} as const
