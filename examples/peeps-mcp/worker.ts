// The Cloudflare Worker: rate limit (when the binding is there), then the MCP endpoint. Deploy: npm run deploy:mcp (from the kit root).
import { handle } from './server.ts'

interface Env {
  PEEPCRAFT_URL?: string
  ALLOWED_ORIGINS?: string
  /** Workers Rate Limiting binding (wrangler.jsonc, "ratelimits"). */
  LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (env.LIMITER && request.method === 'POST') {
      const { success } = await env.LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' })
      if (!success) return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Too many requests; try again in a minute' } }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60', 'Access-Control-Allow-Origin': '*' } })
    }
    return handle(request, { base: env.PEEPCRAFT_URL ?? 'https://peepcraft.jinnux.com/', origins: env.ALLOWED_ORIGINS })
  },
}
