// SVG to PNG in headless Chromium: the picture drawn as an <img> at the asked size on a transparent page, as the web app draws it on a
// canvas. playwright-core (Apache-2.0) is already the kit's browser driver; Chromium comes from `npx playwright install chromium`.
import { chromium } from 'playwright-core'

export async function svgToPng(svg: string, width: number, height: number): Promise<Uint8Array> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width, height } })
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}img{display:block}</style><img width="${width}" height="${height}">`)
    await page.locator('img').evaluate((img: HTMLImageElement, s: string) => { img.src = s; return img.decode() }, src)
    return await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width, height } })
  } finally {
    await browser.close()
  }
}
