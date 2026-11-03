// The Cloudflare Worker: rate limit (when the binding is there), then the MCP endpoint. Deploy: npm run deploy:mcp (from the kit root).
// With the ANTHROPIC_API_KEY secret set (npx wrangler secret put ANTHROPIC_API_KEY), from_image is listed and reads photos with Claude;
// each photo also passes PHOTO_LIMITER, a tighter limit, because each one is a paid model call.
import Anthropic from '@anthropic-ai/sdk'
import { PerceiveError } from '@kit/peeps-engine'
import { handle } from './server.ts'
import type { Perceive } from './tools.ts'

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
}

function photoReader(env: Env, client: string): Perceive | undefined {
  if (!env.ANTHROPIC_API_KEY) return undefined
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 })
  return async (request) => {
    if (env.PHOTO_LIMITER && !(await env.PHOTO_LIMITER.limit({ key: client })).success) throw new PerceiveError('busy', 'Too many photos from here; try again in a minute.')
    return anthropic.beta.messages.create({ ...request, model: env.PERCEIVE_MODEL || request.model } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    if (env.LIMITER && request.method === 'POST') {
      const { success } = await env.LIMITER.limit({ key: client })
      if (!success) return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Too many requests; try again in a minute' } }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60', 'Access-Control-Allow-Origin': '*' } })
    }
    return handle(request, { base: env.PEEPCRAFT_URL ?? 'https://peepcraft.jinnux.com/', origins: env.ALLOWED_ORIGINS, perceive: photoReader(env, client) })
  },
}
