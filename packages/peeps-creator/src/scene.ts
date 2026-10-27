// The picture: background, then the figure scaled / rotated / flipped about the centre of its window. Used on the stage and by the exports.
// The scene view: many peeps and figures standing on one ground line, drawn with the Scene of @kit/peeps.
import { createElement, type ReactElement } from 'react'
import { Background, canvas, Peep, Scene as PeepScene, type Art, type Box, type PeepType } from '@kit/peeps'
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

/** What the stage draws: a peep of one of three types, or a whole figure. Measured outlines are kept per key. */
export const boxKey = (s: Pick<CreatorState, 'type' | 'figure'>): string => (s.figure ? `figure:${s.figure}` : s.type)

/** Before the figure is measured: its canvas. */
export function fallbackBox(s: Pick<CreatorState, 'type' | 'figure'> | PeepType): Box {
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
    createElement('g', { transform: sceneTransform(state, box) }, createElement('g', { ref: measure }, state.figure ? createElement('g', { 'data-figure': state.figure }, createElement(lookupFigure(state.figure), { ink: state.ink, paper: state.paper })) : peepOf(state).group())))
}

/** The scene's height, and the line every member stands on; the width follows the ratio of the frame. */
export const SCENE = 4800
export const GROUND = 4560
/** How far Lift reaches, as a share of the scene; below 0 a member stands in front of the ground line. */
export const LIFT = { min: -0.2, max: 0.8 }

export type Look = Pick<SceneEntry, 'type' | 'parts' | 'ink' | 'paper' | 'figure' | 'thing' | 'upload' | 'colors' | 'partColors' | 'skin'>

/** An uploaded picture as Art: an <image> over its canvas. The data URL keeps exports self-contained. */
const uploadArt = (u: Upload): Art => Object.assign(() => createElement('image', { href: u.href, width: u.width, height: u.height, preserveAspectRatio: 'none', 'data-upload': u.id }), { width: u.width, height: u.height })

/** What a member draws, its canvas, and the scale that puts it among the peeps at size 1. Peeps and things share units; figures are drawn smaller. */
export function drawn(e: Look): { item: Peep | Art; width: number; height: number; base: number } {
  if (e.upload) return { item: uploadArt(e.upload), width: e.upload.width, height: e.upload.height, base: 1 }
  if (e.thing) {
    // Art takes ink and paper only; the colours of the named parts ride along in a small wrapper.
    const t = lookupThing(e.thing), colors = e.colors
    const item: Art = colors ? Object.assign((p: { ink?: string; paper?: string }) => createElement(t, { ...p, colors }), { width: t.width, height: t.height }) : t
    return { item, width: t.width, height: t.height, base: 0.9 }
  }
  if (e.figure) { const f = lookupFigure(e.figure); return { item: f, width: f.width, height: f.height, base: 2.6 } }
  return { item: peepOf(e), ...canvas[e.type], base: 0.9 }
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

/** The whole scene in its frame; `selected` outlines one member and adds a handle at its bottom right to resize it (on the stage, never in an export). */
export function SceneView({ state, selected = null }: { state: CreatorState; selected?: number | null }): ReactElement {
  const picked = selected !== null ? state.scene[selected] : undefined
  const frame = frameBox(state), b = picked && entryBox(picked), h = frame.width * 0.03
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${frame.x} ${frame.y} ${frame.width} ${frame.height}`, ...frameSize(state) },
    new Background(state.bg).render(frame),
    sceneOf(state).group(),
    b && createElement('rect', { ...b, className: 'pc-selected', 'data-selected': selected }),
    b && createElement('rect', { x: b.x + b.width - h / 2, y: b.y + b.height - h / 2, width: h, height: h, rx: h / 5, className: 'pc-handle', 'data-handle': selected }))
}
