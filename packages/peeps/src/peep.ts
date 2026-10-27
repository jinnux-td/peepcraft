// A Peep puts atoms on one canvas. Parts that are not given fall back to the defaults of the type (standing, sitting or bust).
import { createElement, Fragment, useId, type ReactElement, type SVGProps } from 'react'
import { INK, PAPER, type Atom } from './atom.ts'
import { bodyCategory, canvas, onHead, origins, type PeepType, type Point, type Slot } from './layout.ts'
import { lookup } from './registry.ts'
import { holes as skinHoles, props as propAreas, roles as roleAreas, skin as skinAreas, whites as faceWhites, type Role } from './skin.ts'

/** "full" is the standing figure, "half" the bust (head and shoulders). */
export type PeepTypeName = PeepType | 'full' | 'half'

export interface PeepParts {
  /** Pose for standing and sitting, torso for a bust. */
  body?: string
  head?: string
  face?: string
  facialHair?: string
  accessories?: string
}

/** Ink, paper and roles of single parts, over the peep's own: `{ head: { hair, hat }, body: { paper: clothes, top, shoes } }`. A part's
 *  ink is its lines (and black hair, unless \`hair\` is set); its paper everything white that is not skin once \`skin\` is set. A role colours
 *  only that piece: a white piece as paper, a solid black one (hair, a black shirt) as ink, inside its outline. */
export type PartColors = Partial<Record<Slot, { ink?: string; paper?: string } & Partial<Record<Role, string>>>>

export interface PeepOptions extends PeepParts {
  type?: PeepTypeName
  ink?: string
  paper?: string
  colors?: PartColors
  /** One colour for the skin of the head and the body (face, neck, hands, ankles); without it the skin is the paper, as in the pack. */
  skin?: string
}

export interface Placed { slot: Slot; atom: Atom; at: Point }

const alias: Record<PeepTypeName, PeepType> = { standing: 'standing', sitting: 'sitting', bust: 'bust', full: 'standing', half: 'bust' }

/** What a missing part becomes; the figures of "a person/*.svg" in the Open Peeps pack. */
export const defaults: Record<PeepType, Required<PeepParts>> = {
  standing: { body: 'crossed-arms-1', head: 'bun-2', face: 'smile', facialHair: 'none', accessories: 'none' },
  sitting: { body: 'crossed-legs', head: 'bun-2', face: 'smile', facialHair: 'none', accessories: 'none' },
  bust: { body: 'tee-1', head: 'bun-2', face: 'smile', facialHair: 'none', accessories: 'none' },
}

export class Peep {
  readonly type: PeepType
  readonly ink: string
  readonly paper: string
  /** The ids actually used, defaults filled in. */
  readonly parts: Required<PeepParts>
  readonly colors: PartColors
  readonly skin: string | undefined

  constructor(options: PeepOptions = {}) {
    const type = alias[options.type ?? 'standing']
    if (!type) throw new Error(`unknown peep type "${options.type}"`)
    this.type = type
    this.ink = options.ink ?? INK
    this.paper = options.paper ?? PAPER
    this.colors = options.colors ?? {}
    this.skin = options.skin
    const d = defaults[type]
    this.parts = {
      body: options.body ?? d.body, head: options.head ?? d.head, face: options.face ?? d.face,
      facialHair: options.facialHair ?? d.facialHair, accessories: options.accessories ?? d.accessories,
    }
  }

  /** The atoms with their positions on the canvas, back to front. */
  layout(): Placed[] {
    const { body, head } = origins[this.type]
    const at = (slot: 'face' | 'facialHair' | 'accessories'): Point => ({ x: head.x + onHead[slot].x, y: head.y + onHead[slot].y })
    return [
      { slot: 'body', atom: lookup(bodyCategory[this.type], this.parts.body), at: body },
      { slot: 'head', atom: lookup('head', this.parts.head), at: head },
      { slot: 'face', atom: lookup('face', this.parts.face), at: at('face') },
      { slot: 'facialHair', atom: lookup('facialHair', this.parts.facialHair), at: at('facialHair') },
      { slot: 'accessories', atom: lookup('accessories', this.parts.accessories), at: at('accessories') },
    ]
  }

  /** Canvas size of this type, the viewBox of the SVG. */
  get size() { return canvas[this.type] }

  /** One placed part, in its colours, at its place: what `group` draws for each slot (a thumbnail can draw only some). */
  part({ slot, atom, at }: Placed): ReactElement {
    const c = this.colors[slot], key = `${atom.category}/${atom.id}`, roles = roleAreas[key] ?? {}
    // A beard of thin lines only (a pencil moustache) has no hair shape to fill: its hair colour is its ink.
    const ink = (slot === 'facialHair' && !roles.hair ? c?.hair : undefined) ?? c?.ink ?? this.ink, paper = c?.paper ?? this.paper
    // A body's own paper is its clothes; what it holds (a phone, a bike) keeps the peep's paper, and its skin takes the skin colour.
    const overlays: Overlay[] = []
    if (paper !== this.paper && propAreas[key]) overlays.push({ name: 'prop', paper: this.paper, areas: propAreas[key] })
    for (const [r, a] of Object.entries(roles) as [Role, { paper?: string; ink?: string }][]) {
      const col = c?.[r]
      if (col && a.paper) overlays.push({ name: r, paper: col, areas: a.paper })
      if (col && a.ink) overlays.push({ name: `${r}-ink`, ink: col, areas: a.ink })
    }
    if (this.skin && skinAreas[key]) overlays.push({ name: 'skin', paper: this.skin, areas: skinAreas[key] })
    return createElement('g', { key: slot, transform: `translate(${at.x} ${at.y})`, 'data-slot': slot },
      this.skin && skinHoles[key] ? createElement('path', { d: skinHoles[key], fill: this.skin, 'data-hole': '' }) : null,
      // The pack leaves the whites of a face see-through (eyes, teeth, a tear): they take its paper, under its lines.
      faceWhites[key] ? createElement('path', { d: faceWhites[key], fill: paper, 'data-whites': '' }) : null,
      overlays.length ? createElement(Overlaid, { atom, ink, paper, overlays }) : createElement(atom, { ink, paper }))
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

/** Areas of an atom drawn again in another paper or ink: its skin, the things it holds, or a role (its hair, its shoes). */
interface Overlay { name: string; paper?: string; ink?: string; areas: string }

/** An atom drawn as it is, then again per overlay in that paper or ink, masked to its areas, which tuck under the lines around them. A mask, not a
 *  clip: a clip's soft edge is applied to each shape in turn, and the paper under a black shape shows through it as a faint line. */
function Overlaid({ atom: A, ink, paper, overlays }: { atom: Atom; ink: string; paper: string; overlays: Overlay[] }): ReactElement {
  const base = useId().replace(/:/g, '')
  return createElement(Fragment, null,
    createElement(A, { ink, paper }),
    ...overlays.flatMap((o) => [
      createElement('mask', { key: `m${o.name}`, id: base + o.name }, createElement('path', { d: o.areas, fill: '#fff' })),
      createElement('g', { key: o.name, mask: `url(#${base + o.name})`, [`data-${o.name}`]: '' }, createElement(A, { ink: o.ink ?? ink, paper: o.paper ?? paper })),
    ]))
}
