import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import type { Box } from '@kit/peeps'
import { Scene, SceneView, SIZE } from './scene.ts'
import type { CreatorState } from './types.ts'

/** The picture as an SVG document. A transparent background leaves no rectangle, so the file is transparent too. A figure in it must be loaded
 *  first (`await figure.load()`), or it is left empty. */
export const exportSvg = (state: CreatorState, box: Box): string => renderToStaticMarkup(createElement(Scene, { state, box }))

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
