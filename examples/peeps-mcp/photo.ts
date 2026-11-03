// POST /photo: the PeepCraft page's "From photo" button. A photo in, a document out ({ doc, reasons, people }); the page draws it, so
// nothing is rendered here. Each call is a paid model call on the server's key, so only the listed browser origins may call (an Origin
// header is required; a script can forge one, which is why PHOTO_LIMITER also caps each client address). Nothing is stored.
import { checkImage, match, perceiveRequest, PerceiveError, readPerception } from '@kit/peeps-engine'
import type { Perceive } from './tools.ts'

/** A 5 MB image is about 6.7 MB as base64; the page sends far less (it shrinks a photo first). */
export const PHOTO_BODY = 7 * 1024 * 1024

export interface PhotoOptions {
  perceive?: Perceive
  /** Comma-separated origins that may call; never '*'. */
  origins: string
}

const STATUS: Record<PerceiveError['code'], number> = { image: 400, refusal: 422, truncated: 502, 'no-person': 422, reply: 502, busy: 429, quota: 429 }

export async function photo(request: Request, { perceive, origins }: PhotoOptions): Promise<Response> {
  const origin = request.headers.get('Origin')
  const allowed = !!origin && origins.split(',').map((o) => o.trim()).includes(origin)
  const headers = { 'Content-Type': 'application/json', Vary: 'Origin', ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}) }
  const answer = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } })
  const error = (status: number, message: string, retry?: string, code?: string) => answer(status, { error: message, ...(code ? { code } : {}) }, retry ? { 'Retry-After': retry } : {})

  if (!allowed) return error(403, 'this page may not read photos here')
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } })
  if (request.method !== 'POST') return error(405, 'send the photo with POST')
  if (!perceive) return error(503, 'reading photos is not set up on this server')
  const text = await request.text()
  if (text.length > PHOTO_BODY) return error(413, 'the photo is too big; the limit is 5 MB')
  let body: { data?: unknown; mediaType?: unknown; seed?: unknown }
  try { body = JSON.parse(text) } catch { return error(400, 'send JSON: { "data": base64, "mediaType": "image/jpeg" }') }
  if (typeof body?.data !== 'string' || typeof body.mediaType !== 'string') return error(400, 'send JSON: { "data": base64, "mediaType": "image/jpeg" }')
  const image = { data: body.data, mediaType: body.mediaType }
  const seed = Number.isInteger(body.seed) ? body.seed as number : 0
  try {
    checkImage(image)
    const { attributes, people } = readPerception(await perceive(perceiveRequest(image)))
    const { doc, reasons } = match(attributes, { seed })
    return answer(200, { doc, reasons, people })
  } catch (e) {
    if (e instanceof PerceiveError) return error(STATUS[e.code], e.message, e.code === 'busy' ? '60' : undefined, e.code)
    // An API failure (a bad key, an outage): said plainly, without the provider's message, which may carry request details.
    console.error('photo', e)
    return error(502, 'Reading the photo failed on the server; try again later.')
  }
}
