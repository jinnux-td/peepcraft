// The picture: background, then the figure scaled / rotated / flipped about the centre of its window. Used on the stage and by the exports.
// The scene view: many peeps and figures standing on one ground line, drawn with the Scene of @kit/peeps.
import { createElement, type ReactElement } from 'react'
import { Background, canvas, Peep, Scene as PeepScene, type Box, type PeepType } from '@kit/peeps'
import { lookup as lookupFigure } from '@kit/transhumans'
import type { CreatorState, SceneEntry } from './types.ts'

export const SIZE = 1024

export const peepOf = (s: Pick<CreatorState, 'type' | 'ink' | 'paper' | 'parts'>, override: Partial<Record<string, string>> = {}): Peep => new Peep({ type: s.type, ink: s.ink, paper: s.paper, ...s.parts, ...override })

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

/** The scene's canvas, square like the stage, and the line every member stands on. */
export const SCENE = 4800
export const GROUND = 4560

/** Peeps and figures are drawn in different units; at size 1 these make a standing peep and a figure about the same height. */
export const entryScale = (e: SceneEntry): number => (e.figure ? 2.6 : 0.9) * e.size

/** Where a member's canvas lands in the scene: centred on x, its feet on the ground. */
export function entryBox(e: SceneEntry): Box {
  const k = entryScale(e)
  const { width, height } = e.figure ? lookupFigure(e.figure) : canvas[e.type]
  return { x: e.x - (width * k) / 2, y: GROUND - e.bottom * k, width: width * k, height: height * k }
}

export function sceneOf(s: CreatorState): PeepScene {
  const scene = new PeepScene({ width: SCENE, height: SCENE, background: s.bg })
  for (const e of s.scene) {
    const { x, y } = entryBox(e)
    scene.add(e.figure ? lookupFigure(e.figure) : peepOf(e), { x, y, scale: entryScale(e), flip: e.flip, ink: e.ink, paper: e.paper })
  }
  return scene
}

/** The whole scene; `selected` outlines one member on the stage (never in an export). */
export function SceneView({ state, selected = null }: { state: CreatorState; selected?: number | null }): ReactElement {
  const picked = selected !== null ? state.scene[selected] : undefined
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${SCENE} ${SCENE}`, width: SIZE, height: SIZE },
    sceneOf(state).group(),
    picked && createElement('rect', { ...entryBox(picked), className: 'pc-selected', 'data-selected': selected }))
}
