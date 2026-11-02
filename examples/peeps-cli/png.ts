// SVG to PNG in a headless browser: the picture drawn as an <img> at the asked size on a transparent page, as the web app draws it on a
// canvas. playwright-core (Apache-2.0) drives the Chrome or Edge already on the computer, so nothing big is downloaded; Playwright's own
// Chromium (`npx playwright install chromium`) is the last resort.
import { chromium, type Browser } from 'playwright-core'

async function launch(): Promise<Browser> {
  const tried: string[] = []
  for (const channel of ['chrome', 'msedge', undefined]) {
    try { return await chromium.launch(channel ? { channel } : {}) }
    catch (e) { tried.push(`${channel ?? 'Playwright Chromium'}: ${(e as Error).message.split('\n')[0]}`) }
  }
  throw new Error(`PNG needs Chrome or Edge (or run: npx playwright install chromium). SVG works without one.\n  ${tried.join('\n  ')}`)
}

export async function svgToPng(svg: string, width: number, height: number): Promise<Uint8Array> {
  const browser = await launch()
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
