// A Peep puts atoms on one canvas. Parts that are not given fall back to the defaults of the type (standing, sitting or bust).
import { createElement, type ReactElement, type SVGProps } from 'react'
import { INK, PAPER, type Atom, type Role } from './atom.ts'
import { bodyCategory, canvas, onHead, origins, type PeepType, type Point, type Slot } from './layout.ts'
import { lookup } from './registry.ts'

/** "full" is the standing figure, "half" the bust (head and shoulders). */
export type PeepTypeName = PeepType | 'full' | 'half'

export interface PeepParts {
  /** Pose for standing and sitting, torso for a bust. */
  body?: string
  head?: string
  face?: string
  facialHair?: string
  /** A face mask, over the beard and under the glasses. */
  mask?: string
  accessories?: string
}

/** Ink, paper and pieces of single parts, over the peep's own: `{ head: { hair, hat }, body: { top, pants, shoes } }`. A part's ink is its
 *  lines, its paper the pieces that come in white; a piece (named after its layer group in Figma) takes the colour given for it. */
export type PartColors = Partial<Record<Slot, { ink?: string; paper?: string } & Partial<Record<Role, string>>>>

export interface PeepOptions extends PeepParts {
  type?: PeepTypeName
  ink?: string
  paper?: string
  colors?: PartColors
  /** One colour for the skin of the head and the body (face, neck, hands, ankles); without it the skin keeps its own. */
  skin?: string
  /** Black and white: lines in the ink, everything else in the paper, whatever the colours. */
  mono?: boolean
}

export interface Placed { slot: Slot; atom: Atom; at: Point }

const alias: Record<PeepTypeName, PeepType> = { standing: 'standing', sitting: 'sitting', bust: 'bust', full: 'standing', half: 'bust' }

/** What a missing part becomes; the figures of "a person/*.svg" in the Open Peeps pack. */
export const defaults: Record<PeepType, Required<PeepParts>> = {
  standing: { body: 'crossed-arms-1', head: 'bun-2', face: 'smile', facialHair: 'none', mask: 'none', accessories: 'none' },
  sitting: { body: 'crossed-legs', head: 'bun-2', face: 'smile', facialHair: 'none', mask: 'none', accessories: 'none' },
  bust: { body: 'tee-1', head: 'bun-2', face: 'smile', facialHair: 'none', mask: 'none', accessories: 'none' },
}

export class Peep {
  readonly type: PeepType
  readonly ink: string
  readonly paper: string
  /** The ids actually used, defaults filled in. */
  readonly parts: Required<PeepParts>
  readonly colors: PartColors
  readonly skin: string | undefined
  readonly mono: boolean

  constructor(options: PeepOptions = {}) {
    const type = alias[options.type ?? 'standing']
    if (!type) throw new Error(`unknown peep type "${options.type}"`)
    this.type = type
    this.ink = options.ink ?? INK
    this.paper = options.paper ?? PAPER
    this.colors = options.colors ?? {}
    this.skin = options.skin
    this.mono = options.mono ?? false
    const d = defaults[type]
    this.parts = {
      body: options.body ?? d.body, head: options.head ?? d.head, face: options.face ?? d.face,
      facialHair: options.facialHair ?? d.facialHair, mask: options.mask ?? d.mask, accessories: options.accessories ?? d.accessories,
    }
  }

  /** The atoms with their positions on the canvas, back to front. */
  layout(): Placed[] {
    const { body, head } = origins[this.type]
    const at = (slot: 'face' | 'facialHair' | 'mask' | 'accessories'): Point => ({ x: head.x + onHead[slot].x, y: head.y + onHead[slot].y })
    return [
      { slot: 'body', atom: lookup(bodyCategory[this.type], this.parts.body), at: body },
      { slot: 'head', atom: lookup('head', this.parts.head), at: head },
      { slot: 'face', atom: lookup('face', this.parts.face), at: at('face') },
      { slot: 'facialHair', atom: lookup('facialHair', this.parts.facialHair), at: at('facialHair') },
      { slot: 'mask', atom: lookup('mask', this.parts.mask), at: at('mask') },
      { slot: 'accessories', atom: lookup('accessories', this.parts.accessories), at: at('accessories') },
    ]
  }

  /** Canvas size of this type, the viewBox of the SVG. */
  get size() { return canvas[this.type] }

  /** One placed part, in its colours, at its place: what `group` draws for each slot (a thumbnail can draw only some). */
  part({ slot, atom, at }: Placed): ReactElement {
    const c = this.colors[slot]
    return createElement('g', { key: slot, transform: `translate(${at.x} ${at.y})`, 'data-slot': slot },
      createElement(atom, { ink: c?.ink ?? this.ink, paper: c?.paper ?? this.paper, mono: this.mono, colors: this.skin ? { skin: this.skin, ...c } : c }))
  }

  /** The group of atoms, for placing inside a bigger scene. */
  group(props: SVGProps<SVGGElement> = {}): ReactElement {
    return createElement('g', props, ...this.layout().map((p) => this.part(p)))
  }

  /** A standalone SVG. */
  render(props: SVGProps<SVGSVGElement> = {}): ReactElement {
    const { width, height } = this.size
    return createElement('svg', { viewBox: `0 0 ${width} ${height}`, xmlns: 'http://www.w3.org/2000/svg', ...props }, this.group())
  }
}
