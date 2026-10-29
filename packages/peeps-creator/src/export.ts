import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { defaults, type Box, type Slot } from '@kit/peeps'
import { Scene, SceneView, SIZE, type Look } from './scene.ts'
import type { CreatorState } from './types.ts'

/** The picture as an SVG document. A transparent background leaves no rectangle, so the file is transparent too. A figure in it must be loaded
 *  first (`await figure.load()`), or it is left empty. */
export const exportSvg = (state: CreatorState, box: Box): string => renderToStaticMarkup(createElement(Scene, { state, box }))

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const headToToe: readonly Slot[] = ['head', 'face', 'facialHair', 'mask', 'accessories', 'body']
/** What a look is made of, in one word: "bust-afro-smile-tee-1", "figure-runner", "chair", "logo". Parts left at none are not named. */
const lookName = (l: Look): string => l.upload ? slug(l.upload.name.replace(/\.[^.]+$/, '')) || 'upload' : l.thing ? l.thing : l.figure ? `figure-${l.figure}`
  : [l.type, ...headToToe.map((slot) => l.parts[slot] ?? defaults[l.type][slot]), l.extra?.id].filter((id) => id && id !== 'none').join('-')

/** The download's name from what is in it: the peep's parts, or each member of the scene ("scene_figure-runner_bust-bun-2-smile-tee-1.png"),
 *  cut after a whole member to stay a sane length. */
export function fileName(state: CreatorState, inScene: boolean, kind: 'svg' | 'png'): string {
  const name = inScene ? ['scene', ...state.scene.map(lookName)].join('_') : lookName(state)
  return `${name.length > 120 ? name.slice(0, 121).replace(/_[^_]*$/, '') : name}.${kind}`
}

/** The whole scene as an SVG document, with no selection outline. Figures as for exportSvg. */
export const exportSceneSvg = (state: CreatorState): string => renderToStaticMarkup(createElement(SceneView, { state }))

/** Draws the SVG on a canvas (square unless a height is given) without filling it first, so transparent stays transparent. Browser only. */
export function svgToPng(svg: string, width = SIZE, height = width): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = width; c.height = height
      c.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('could not encode the PNG'))), 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not draw the SVG')) }
    img.src = url
  })
}
