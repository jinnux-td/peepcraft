// GET /avatar/<seed>.svg: the same seed draws the same peep, for an <img> in a README or a profile. Nothing is stored, and the seed picks
// parts and colours but is never written into the picture, so what a visitor types cannot reach the SVG.
import { randomDoc, renderSvg, swatches } from '@kit/peeps-engine'

const PATH = /^\/avatar\/([^/]{1,64})\.svg$/
/** The swatches black lines read on: not the dark one, and not white, which would look like no background. */
const BACKGROUNDS = swatches.bg.filter((c) => c !== '#ffffff' && c !== '#1f2937')

/** FNV-1a: the seed as the number the engine's generator takes. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

export async function avatar(request: Request, path: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
  const seed = path.match(PATH)?.[1]
  if (!seed) return new Response('Not found: /avatar/<seed>.svg, a seed of 1 to 64 characters\n', { status: 404 })
  const h = hash(seed)
  const doc = randomDoc({ seed: h, keep: { v: 1, bg: BACKGROUNDS[h % BACKGROUNDS.length], skin: swatches.skin[(h >>> 8) % swatches.skin.length] } })
  const { svg } = await renderSvg(doc)
  // shortcut: no edge cache, so only browsers and proxies keep a copy; add caches.default if the rate limit starts to refuse real embeds.
  return new Response(request.method === 'HEAD' ? null : svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' } })
}
