// The picture: background, then the figure scaled / rotated / flipped about the centre of its window. Used on the stage and by the exports.
// The scene view: many peeps and figures standing on one ground line, drawn with the Scene of @kit/peeps.
import { createElement, type ReactElement } from 'react'
import { Background, canvas, origins, Peep, Scene as PeepScene, type Art, type Box, type PeepType } from '@kit/peeps'
import { lookup as lookupThing } from '@kit/things'
import { lookup as lookupFigure } from '@kit/transhumans'
import { plain, wornColors } from './outfit.ts'
import { RATIOS, type CreatorState, type SceneEntry, type Upload } from './types.ts'

export const SIZE = 1024

/** The peep of a state, in its items' own colours under the picked ones; `override` swaps items (a thumbnail), which come in their own. */
export function peepOf(s: Pick<CreatorState, 'type' | 'ink' | 'paper' | 'parts'> & Partial<Pick<CreatorState, 'partColors' | 'skin' | 'mono'>>, override: Partial<Record<string, string>> = {}): Peep {
  const parts = { ...s.parts, ...override }, picked = { ...s.partColors }
  if (s.mono) return new Peep({ type: s.type, ink: s.ink, paper: s.paper, ...parts })
  for (const slot of Object.keys(override) as (keyof typeof picked)[]) picked[slot] = plain(picked[slot])
  return new Peep({ type: s.type, ink: s.ink, paper: s.paper, colors: wornColors(s.type, parts, picked), skin: s.skin, ...parts })
}

/** A square window on a measured outline, with air around it. */
export function squareAround(b: Box): Box {
  const side = Math.max(b.width, b.height) * 1.14
  return { x: b.x + b.width / 2 - side / 2, y: b.y + b.height / 2 - side / 2, width: side, height: side }
}

/** What the stage draws: a peep of one of three types (with an extra or not), or a whole figure. Measured outlines are kept per key. */
export const boxKey = (s: Pick<CreatorState, 'type' | 'figure' | 'extra'>): string => (s.figure ? `figure:${s.figure}` : s.extra ? `${s.type}+${s.extra.id}` : s.type)

/** Before the figure is measured: its canvas. */
export function fallbackBox(s: Pick<CreatorState, 'type' | 'figure' | 'extra'> | PeepType): Box {
  if (typeof s !== 'string' && s.extra && !s.figure) { const { width, height } = withExtra(s.type, s.extra.id); return squareAround({ x: 0, y: 0, width, height }) }
  if (typeof s !== 'string' && s.figure) { const f = lookupFigure(s.figure); return squareAround({ x: 0, y: 0, width: f.width, height: f.height }) }
  return squareAround({ x: 0, y: 0, ...canvas[typeof s === 'string' ? s : s.type] })
}

export function sceneTransform(s: CreatorState, box: Box): string {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, k = s.scale
  return `translate(${cx} ${cy}) rotate(${s.rotate}) scale(${s.flip ? -k : k} ${k}) translate(${-cx} ${-cy})`
}

/** `measure` receives the group holding the figure, in its own unscaled space, to take its bounding box. */
export function Scene({ state, box, measure }: { state: CreatorState; box: Box; measure?: (el: SVGGElement | null) => void }): ReactElement {
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${box.x} ${box.y} ${box.width} ${box.height}`, width: SIZE, height: SIZE },
    new Background(state.bg).render(box),
    createElement('g', { transform: sceneTransform(state, box) }, createElement('g', { ref: measure }, state.figure ? createElement('g', { 'data-figure': state.figure }, createElement(lookupFigure(state.figure), { ink: state.ink, paper: state.paper })) : state.extra ? createElement(drawn(state).item as Art, {}) : peepOf(state).group())))
}

/** The scene's height, and the line every member stands on; the width follows the ratio of the frame. */
export const SCENE = 4800
export const GROUND = 4560
/** How far Lift reaches, as a share of the scene; below 0 a member stands in front of the ground line. */
export const LIFT = { min: -0.2, max: 0.8 }

export type Look = Pick<SceneEntry, 'type' | 'parts' | 'ink' | 'paper' | 'figure' | 'thing' | 'upload' | 'colors' | 'partColors' | 'skin' | 'extra'>

/** An uploaded picture as Art: an <image> over its canvas. The data URL keeps exports self-contained. */
const uploadArt = (u: Upload): Art => Object.assign(() => createElement('image', { href: u.href, width: u.width, height: u.height, preserveAspectRatio: 'none', 'data-upload': u.id }), { width: u.width, height: u.height })

const wrappers = new Map<string, Art>()

/** What a member draws, its canvas, and the scale that puts it among the peeps at size 1. Peeps and things share units; figures are drawn smaller. */
export function drawn(e: Look): { item: Peep | Art; width: number; height: number; base: number } {
  if (e.upload) return { item: uploadArt(e.upload), width: e.upload.width, height: e.upload.height, base: 1 }
  if (e.thing) {
    // Art takes ink and paper only; the colours of the named parts, each its own until one is picked, ride along in a small wrapper. One
    // wrapper per thing and colours, kept: a new one each render would be a new component, and React would swap the drawing under the
    // pointer between press and release, so a click on it would never fire.
    const t = lookupThing(e.thing), colors = { ...t.pieces, ...e.colors }, key = `${e.thing}|${JSON.stringify(colors)}`
    let item = wrappers.get(key)
    if (!item) wrappers.set(key, (item = Object.assign((p: { ink?: string; paper?: string }) => createElement(t, { ...p, colors }), { width: t.width, height: t.height })))
    return { item, width: t.width, height: t.height, base: 0.9 }
  }
  if (e.figure) { const f = lookupFigure(e.figure); return { item: f, width: f.width, height: f.height, base: 2.6 } }
  if (!e.extra) return { item: peepOf(e), ...canvas[e.type], base: 0.9 }
  // A peep with an extra: the canvas grows to hold it and the peep moves into it, feet still at the bottom. Kept per look, for the same
  // reason as the wrappers of things.
  const mono = 'mono' in e && !!e.mono, key = JSON.stringify([e.type, e.parts, e.ink, e.paper, e.partColors, e.skin, e.extra, mono])
  const { width, height, left, top, at, around } = withExtra(e.type, e.extra.id)
  let item = wrappers.get(key)
  if (!item) {
    const peep = peepOf(e), T = lookupThing(e.extra.id), colors = mono ? { ink: '#111111', paper: '#ffffff' } : { ink: e.extra.ink, paper: e.extra.paper }
    const extra = around ? aura(`extra-${hash(key)}`, around, colors, peep.group()) : createElement('g', { transform: `translate(${at.x} ${at.y}) scale(${at.scale})` }, createElement(T, colors))
    wrappers.set(key, (item = Object.assign(() => createElement('g', { transform: `translate(${left} ${top})` },
      ...(around ? [createElement('g', { key: 'x', 'data-extra': e.extra!.id }, extra), createElement('g', { key: 'p' }, peep.group())]
        : [createElement('g', { key: 'p' }, peep.group()), createElement('g', { key: 'x', 'data-extra': e.extra!.id }, extra)])), { width, height })))
  }
  return { item, width, height, base: 0.9 }
}

/** FNV-1a, for a filter id per look: two thumbnails of other colours on one page must not share one. */
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36) }

/** An aura: the peep drawn again behind itself through a filter that keeps only its outline, grown `r` units out and filled with `paper`,
 *  in a line of `ink` a little further out. Blurring the outline and keeping what is not quite clear grows it with round corners. */
function aura(id: string, r: number, { ink, paper }: { ink: string; paper: string }, peep: ReactElement): ReactElement {
  // The outline blurred, what is not quite clear kept, filled with `colour`: the shape grown by about `sd` * 1.6, round at the corners.
  const grown = (sd: number, colour: string, out: string) => [
    createElement('feGaussianBlur', { key: `${out}b`, in: 'SourceAlpha', stdDeviation: sd, result: `${out}-b` }),
    createElement('feComponentTransfer', { key: `${out}t`, in: `${out}-b`, result: `${out}-a` }, createElement('feFuncA', { type: 'table', tableValues: '0 1 1 1 1 1 1 1 1 1' })),
    createElement('feFlood', { key: `${out}f`, floodColor: colour, result: `${out}-f` }),
    createElement('feComposite', { key: `${out}c`, in: `${out}-f`, in2: `${out}-a`, operator: 'in', result: out }),
  ]
  return createElement('g', null,
    createElement('defs', null, createElement('filter', { id, x: '-25%', y: '-25%', width: '150%', height: '150%' },
      ...grown(r * 0.62, ink, 'line'), ...grown(r * 0.5, paper, 'glow'),
      createElement('feMerge', null, createElement('feMergeNode', { in: 'line' }), createElement('feMergeNode', { in: 'glow' })))),
    createElement('g', { filter: `url(#${id})` }, peep))
}

/** The canvas of a peep wearing an extra, how far the peep moves into it, and where the extra goes: by the head (its `place`), or around
 *  the peep (`around` units out), with room for it on the top and the sides; the feet stay at the bottom. */
export function withExtra(type: PeepType, id: string): { width: number; height: number; left: number; top: number; at: { x: number; y: number; scale: number }; around?: number } {
  const T = lookupThing(id), place = T.place ?? { x: 0, y: 0, scale: 1 }, head = origins[type].head, c = canvas[type]
  if ('around' in place) { const m = Math.round(place.around * 1.4); return { width: c.width + 2 * m, height: c.height + m, left: m, top: m, at: { x: 0, y: 0, scale: 1 }, around: place.around } }
  const x = head.x + place.x, y = head.y + place.y, top = Math.max(0, -y)
  return { width: Math.max(c.width, x + T.width * place.scale), height: c.height + top, left: 0, top, at: { x, y, scale: place.scale } }
}

export const entryScale = (e: SceneEntry): number => drawn(e).base * e.size

/** Where a member's canvas lands in the scene: centred on x, its feet on the ground, or lifted above it. */
export function entryBox(e: SceneEntry): Box {
  const { width, height, base } = drawn(e), k = base * e.size
  return { x: e.x - (width * k) / 2, y: GROUND - e.bottom * k - (e.lift ?? 0), width: width * k, height: height * k }
}

export const sceneWidth = (s: Pick<CreatorState, 'frame'>): number => SCENE * RATIOS[s.frame.ratio]

/** The part of the scene in the picture: zoom shrinks it about the middle of the ground line, so the ground stays put. */
export function frameBox(s: Pick<CreatorState, 'frame'>): Box {
  const w = sceneWidth(s), z = s.frame.zoom
  return { x: w / 2 - w / (2 * z), y: GROUND - GROUND / z, width: w / z, height: SCENE / z }
}

/** Pixel size of the picture: the long side is SIZE. */
export function frameSize(s: Pick<CreatorState, 'frame'>): { width: number; height: number } {
  const r = RATIOS[s.frame.ratio]
  return r >= 1 ? { width: SIZE, height: Math.round(SIZE / r) } : { width: Math.round(SIZE * r), height: SIZE }
}

/** The members, without a background: the frame draws it, as it can be bigger than the scene when zoomed out. */
export function sceneOf(s: CreatorState): PeepScene {
  const scene = new PeepScene({ width: sceneWidth(s), height: SCENE })
  for (const e of s.scene) {
    const { x, y } = entryBox(e)
    scene.add(drawn(e).item, { x, y, scale: entryScale(e), flip: e.flip, ink: e.ink, paper: e.paper })
  }
  return scene
}

/** The whole scene in its frame; `selected` outlines one member and adds a small handle at each corner to resize it (on the stage, never in
 *  an export). A handle is a dot, so it hides little of the picture, in a wider ring that is not drawn, so it is easy to grab. */
export function SceneView({ state, selected = null }: { state: CreatorState; selected?: number | null }): ReactElement {
  const picked = selected !== null ? state.scene[selected] : undefined
  const frame = frameBox(state), b = picked && entryBox(picked), r = frame.width * 0.008
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`, ...frameSize(state) },
    new Background(state.bg).render(frame),
    sceneOf(state).group(),
    b && createElement('rect', { ...b, className: 'pc-selected', 'data-selected': selected }),
    ...(b ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : []).map(([sx, sy]) => createElement('g', { key: `${sx},${sy}`, className: 'pc-handle', 'data-handle': selected, 'data-corner': `${sx},${sy}`, style: { cursor: sx === sy ? 'nwse-resize' : 'nesw-resize' } },
      createElement('circle', { cx: b!.x + (b!.width * (sx + 1)) / 2, cy: b!.y + (b!.height * (sy + 1)) / 2, r: r * 2.5, fill: 'transparent' }),
      createElement('circle', { cx: b!.x + (b!.width * (sx + 1)) / 2, cy: b!.y + (b!.height * (sy + 1)) / 2, r }))))
}
