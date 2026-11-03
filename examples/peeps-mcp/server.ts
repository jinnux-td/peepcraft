// MCP over Streamable HTTP, stateless, in plain fetch() terms (a Cloudflare Worker, or Node in the tests). Dual-era:
//   modern (2026-07-28): every request carries its version in params._meta; headers MCP-Protocol-Version, Mcp-Method and Mcp-Name mirror
//     the body and are checked; server/discover; results carry resultType and the server's identity.
//   legacy (2025-03-26 to 2025-11-25): an initialize handshake, answered without a session (none is needed: nothing is kept between calls).
// One JSON response per request; no SSE stream, no GET stream, no sessions.
import { photo, PHOTO_BODY } from './photo.ts'
import { callTool, readResource, resources, toolsFor, type Perceive } from './tools.ts'

export const MODERN = ['2026-07-28'] as const
export const LEGACY = ['2025-11-25', '2025-06-18', '2025-03-26'] as const
const SUPPORTED: readonly string[] = [...MODERN, ...LEGACY]
const SERVER_INFO = { name: 'peepcraft', title: 'PeepCraft', version: '1.0.0', websiteUrl: 'https://peepcraft.jinnux.com/' }
const INSTRUCTIONS = 'PeepCraft draws Open Peeps characters and scenes from a JSON document. Call describe once, find ids with search_parts, then render. A render returns the SVG and a link that opens the picture in PeepCraft, where the person can edit it and save a PNG. A bad document comes back with every problem and the valid choices.'
const CAPABILITIES = { tools: {}, resources: {} }
/** Lists and the catalogue change only with a deploy. */
const CACHE = { ttlMs: 3_600_000, cacheScope: 'public' as const }
const MAX_BODY = 64 * 1024

export interface Options {
  /** The page a share link opens. */
  base: string
  /** Origins allowed to call from a browser; '*' (the default) allows any, as nothing here is private or stored. */
  origins?: string
  /** Sends a photo to a vision model; without it, from_image is not listed. */
  perceive?: Perceive
  /** Browser origins that may send photos to POST /photo (the PeepCraft page); none, no browser may. */
  photoOrigins?: string
}

type Id = string | number | null
interface RpcError { code: number; message: string; data?: unknown }

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})

const reply = (status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...cors(origin), ...extra } })
const ok = (id: Id, result: unknown, origin: string | null) => reply(200, { jsonrpc: '2.0', id, result }, origin)
const fail = (status: number, id: Id, error: RpcError, origin: string | null) => reply(status, { jsonrpc: '2.0', id, error }, origin)

/** `=?base64?...?=` header values are UTF-8 in base64 (Mcp-Name for names or URIs outside plain ASCII). */
function headerValue(v: string | null): string | null {
  const m = v?.match(/^=\?base64\?([A-Za-z0-9+/=]*)\?=$/)
  if (!m) return v
  try { return new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))) } catch { return null }
}

export async function handle(request: Request, options: Options): Promise<Response> {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  const allowed = !origin || !options.origins || options.origins === '*' || options.origins.split(',').map((o) => o.trim()).includes(origin)
  if (url.pathname === '/photo') return photo(request, { perceive: options.perceive, origins: options.photoOrigins ?? '' })
  if (url.pathname !== '/mcp') {
    if (url.pathname === '/' && request.method === 'GET') return new Response('PeepCraft MCP server. Endpoint: POST /mcp (Streamable HTTP). https://peepcraft.jinnux.com/\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return new Response('Not found\n', { status: 404 })
  }
  if (!allowed) return fail(403, null, { code: -32600, message: `origin ${origin} is not allowed` }, null)
  if (request.method === 'OPTIONS') return reply(204, undefined, origin)
  // No GET stream and no sessions to end, in any revision this server speaks.
  if (request.method !== 'POST') return reply(405, undefined, origin, { Allow: 'POST, OPTIONS' })
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') ?? '')) return fail(415, null, { code: -32600, message: 'send JSON (Content-Type: application/json)' }, origin)

  const text = await request.text()
  // from_image may carry a photo's bytes; every other request is small.
  const max = options.perceive ? PHOTO_BODY : MAX_BODY
  if (text.length > max) return fail(413, null, { code: -32600, message: `a request is at most ${max} bytes` }, origin)
  let msg: unknown
  try { msg = JSON.parse(text) } catch { return fail(400, null, { code: -32700, message: 'Parse error' }, origin) }
  if (Array.isArray(msg)) return fail(400, null, { code: -32600, message: 'batches are not supported; send one message per request' }, origin)
  if (typeof msg !== 'object' || msg === null || (msg as { jsonrpc?: unknown }).jsonrpc !== '2.0' || typeof (msg as { method?: unknown }).method !== 'string') {
    return fail(400, null, { code: -32600, message: 'Invalid Request: a JSON-RPC 2.0 request or notification' }, origin)
  }
  const { id, method, params = {} } = msg as { id?: Id; method: string; params?: Record<string, unknown> }
  // A notification (notifications/initialized from a legacy client, or anything else): nothing to answer.
  if (id === undefined) return reply(202, undefined, origin)
  if (typeof params !== 'object' || params === null) return fail(400, id, { code: -32602, message: 'params is an object' }, origin)

  const meta = (params._meta ?? {}) as Record<string, unknown>
  const version = meta['io.modelcontextprotocol/protocolVersion']
  const header = request.headers.get('MCP-Protocol-Version')

  // Legacy: the handshake, then requests without the per-request _meta.
  if (method === 'initialize') {
    const asked = (params as { protocolVersion?: string }).protocolVersion
    const chosen = asked && (LEGACY as readonly string[]).includes(asked) ? asked : LEGACY[0]
    return ok(id, { protocolVersion: chosen, capabilities: CAPABILITIES, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS }, origin)
  }
  if (typeof version !== 'string') {
    if (header && !(LEGACY as readonly string[]).includes(header)) {
      return (MODERN as readonly string[]).includes(header)
        ? fail(400, id, { code: -32020, message: `Header mismatch: MCP-Protocol-Version is ${header} but the body carries no io.modelcontextprotocol/protocolVersion` }, origin)
        : fail(400, id, { code: -32022, message: 'Unsupported protocol version', data: { supported: SUPPORTED, requested: header } }, origin)
    }
    return legacy(id, method, params, options, origin)
  }

  // Modern: check the version, then that the headers mirror the body.
  if (!(MODERN as readonly string[]).includes(version)) return fail(400, id, { code: -32022, message: 'Unsupported protocol version', data: { supported: SUPPORTED, requested: version } }, origin)
  const mismatch = (what: string) => fail(400, id, { code: -32020, message: `Header mismatch: ${what}` }, origin)
  if (header === null) return mismatch('MCP-Protocol-Version is missing')
  if (header !== version) return mismatch(`MCP-Protocol-Version header value '${header}' does not match body value '${version}'`)
  const mcpMethod = request.headers.get('Mcp-Method')
  if (mcpMethod === null) return mismatch('Mcp-Method is missing')
  if (mcpMethod !== method) return mismatch(`Mcp-Method header value '${mcpMethod}' does not match body value '${method}'`)
  if (method === 'tools/call' || method === 'resources/read') {
    const named = method === 'tools/call' ? params.name : params.uri
    const raw = request.headers.get('Mcp-Name'), name = headerValue(raw)
    if (raw === null) return mismatch('Mcp-Name is missing')
    if (name !== named) return mismatch(`Mcp-Name header value '${name}' does not match body value '${String(named)}'`)
  }
  return modern(id, method, params, options, origin)
}

const serverMeta = { _meta: { 'io.modelcontextprotocol/serverInfo': SERVER_INFO } }

async function modern(id: Id, method: string, params: Record<string, unknown>, options: Options, origin: string | null): Promise<Response> {
  const done = (result: Record<string, unknown>) => ok(id, { resultType: 'complete', ...result, ...serverMeta }, origin)
  switch (method) {
    case 'server/discover': return done({ supportedVersions: SUPPORTED, capabilities: CAPABILITIES, instructions: INSTRUCTIONS, ...CACHE })
    case 'tools/list': return done({ tools: toolsFor(!!options.perceive), ...CACHE })
    case 'resources/list': return done({ resources, ...CACHE })
    case 'resources/templates/list': return done({ resourceTemplates: [], ...CACHE })
    case 'resources/read': {
      const text = readResource(String(params.uri))
      if (text === undefined) return fail(400, id, { code: -32602, message: `no resource ${String(params.uri)}`, data: { uri: params.uri } }, origin)
      const r = resources.find((x) => x.uri === params.uri)!
      return done({ contents: [{ uri: r.uri, mimeType: r.mimeType, text }], ...CACHE })
    }
    case 'tools/call': {
      const result = await call(params, options)
      return result.error ? fail(400, id, result.error, origin) : done(result.ok!)
    }
    default: return fail(404, id, { code: -32601, message: `Method not found: ${method}` }, origin)
  }
}

async function legacy(id: Id, method: string, params: Record<string, unknown>, options: Options, origin: string | null): Promise<Response> {
  switch (method) {
    case 'ping': return ok(id, {}, origin)
    case 'server/discover': return ok(id, { supportedVersions: SUPPORTED, capabilities: CAPABILITIES, instructions: INSTRUCTIONS, ...serverMeta }, origin)
    case 'tools/list': return ok(id, { tools: toolsFor(!!options.perceive) }, origin)
    case 'resources/list': return ok(id, { resources }, origin)
    case 'resources/templates/list': return ok(id, { resourceTemplates: [] }, origin)
    case 'resources/read': {
      const text = readResource(String(params.uri))
      if (text === undefined) return fail(200, id, { code: -32002, message: `no resource ${String(params.uri)}`, data: { uri: params.uri } }, origin)
      const r = resources.find((x) => x.uri === params.uri)!
      return ok(id, { contents: [{ uri: r.uri, mimeType: r.mimeType, text }] }, origin)
    }
    case 'tools/call': {
      const result = await call(params, options)
      return result.error ? fail(200, id, result.error, origin) : ok(id, result.ok, origin)
    }
    default: return fail(200, id, { code: -32601, message: `Method not found: ${method}` }, origin)
  }
}

async function call(params: Record<string, unknown>, options: Options): Promise<{ ok?: Record<string, unknown>; error?: RpcError }> {
  const name = params.name, args = params.arguments ?? {}
  if (typeof name !== 'string') return { error: { code: -32602, message: 'tools/call needs a name' } }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) return { error: { code: -32602, message: 'arguments is an object' } }
  const result = await callTool(name, args as Record<string, unknown>, options.base, options.perceive)
  if (!result) return { error: { code: -32602, message: `Unknown tool: ${name}`, data: { tools: toolsFor(!!options.perceive).map((t) => t.name) } } }
  return { ok: result as unknown as Record<string, unknown> }
}
