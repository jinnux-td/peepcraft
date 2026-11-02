// PNG export in the browser: the SVG drawn on a canvas. The CLI makes PNGs its own way.
import { SIZE } from '@kit/peeps-engine'

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
