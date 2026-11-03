// The Cloudflare Worker: rate limit (when the binding is there), then the MCP endpoint. Deploy: npm run deploy:mcp (from the kit root).
// With the ANTHROPIC_API_KEY secret set (npx wrangler secret put ANTHROPIC_API_KEY), from_image is listed and reads photos with Claude;
// each photo also passes PHOTO_LIMITER, a tighter limit, because each one is a paid model call, then the daily cap (PHOTO_CAP, a Durable
// Object, PHOTO_DAILY_LIMIT photos a UTC day for the whole server). Without the cap binding, photos are not offered: no cap, no spending.
import Anthropic from '@anthropic-ai/sdk'
import { PerceiveError } from '@kit/peeps-engine'
import { takePlace, type CapNamespace } from './cap.ts'
import { handle } from './server.ts'
import type { Perceive } from './tools.ts'

export { PhotoCap } from './cap.ts'

/** Photos a day when PHOTO_DAILY_LIMIT is unset or not a number. */
const DAILY_LIMIT = 50

interface Limiter { limit(options: { key: string }): Promise<{ success: boolean }> }

interface Env {
  PEEPCRAFT_URL?: string
  ALLOWED_ORIGINS?: string
  /** Workers Rate Limiting binding (wrangler.jsonc, "ratelimits"). */
  LIMITER?: Limiter
  /** A secret: without it, the server does not offer from_image. */
  ANTHROPIC_API_KEY?: string
  /** The model that reads photos; the engine's PERCEIVE_MODEL when unset. */
  PERCEIVE_MODEL?: string
  /** Photos per client address per minute (wrangler.jsonc, "ratelimits"). */
  PHOTO_LIMITER?: Limiter
  /** Browser origins that may call POST /photo (the PeepCraft page's From photo button), comma-separated. */
  PHOTO_ORIGINS?: string
  /** The daily cap (wrangler.jsonc, "durable_objects"). */
  PHOTO_CAP?: CapNamespace
  /** Photos a UTC day for the whole server; 0 turns photos off. */
  PHOTO_DAILY_LIMIT?: string
}

function photoReader(env: Env, client: string): Perceive | undefined {
  if (!env.ANTHROPIC_API_KEY || !env.PHOTO_CAP) return undefined
  const cap = env.PHOTO_CAP, n = Number(env.PHOTO_DAILY_LIMIT ?? DAILY_LIMIT), daily = Number.isFinite(n) ? n : DAILY_LIMIT
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 })
  return async (request) => {
    if (env.PHOTO_LIMITER && !(await env.PHOTO_LIMITER.limit({ key: client })).success) throw new PerceiveError('busy', 'Too many photos from here; try again in a minute.')
    if (!(await takePlace(cap, daily))) throw new PerceiveError('quota', 'PeepCraft has read all the photos it can today; try again tomorrow.')
    try {
      return await anthropic.beta.messages.create({ ...request, model: env.PERCEIVE_MODEL || request.model } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming)
    } catch (e) {
      // For the logs only (the caller sees a plain message): which limit a 429 hit, from the API's rate limit headers.
      if (e instanceof Anthropic.APIError && e.headers) {
        const h = e.headers as Headers
        console.error('anthropic', e.status, Object.fromEntries([...h.entries()].filter(([k]) => k.startsWith('anthropic-ratelimit') || k === 'retry-after' || k === 'request-id')))
      }
      throw e
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    if (env.LIMITER && request.method === 'POST') {
      const { success } = await env.LIMITER.limit({ key: client })
      if (!success) return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Too many requests; try again in a minute' } }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60', 'Access-Control-Allow-Origin': '*' } })
    }
    return handle(request, { base: env.PEEPCRAFT_URL ?? 'https://peepcraft.jinnux.com/', origins: env.ALLOWED_ORIGINS, perceive: photoReader(env, client), photoOrigins: env.PHOTO_ORIGINS })
  },
}
