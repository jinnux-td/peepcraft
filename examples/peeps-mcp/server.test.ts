// The MCP server through fetch(): both protocol eras, the header checks, the errors, and the built Worker bundle drawing the golden SVGs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { handle } from './server.ts'

const golden = new URL('../../packages/peeps-engine/test/golden/', import.meta.url)
const doc = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, golden), 'utf8'))
const svg = (name: string) => readFileSync(new URL(`${name}.svg`, golden), 'utf8')
const options = { base: 'https://peepcraft.jinnux.com/' }
const V = '2026-07-28'
const meta = { 'io.modelcontextprotocol/protocolVersion': V, 'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' }, 'io.modelcontextprotocol/clientCapabilities': {} }

let next = 1
type Fetch = (r: Request) => Promise<Response>
const post = (body: unknown, headers: Record<string, string> = {}, fetch: Fetch = (r) => handle(r, options)) =>
  fetch(new Request('https://peepcraft-mcp.jinnux.com/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }))

/** A modern request with the headers that mirror it. */
async function modern(method: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}, fetch?: Fetch) {
  const name = method === 'tools/call' ? params.name : method === 'resources/read' ? params.uri : undefined
  const res = await post({ jsonrpc: '2.0', id: next++, method, params: { ...params, _meta: meta } }, { 'MCP-Protocol-Version': V, 'Mcp-Method': method, ...(name ? { 'Mcp-Name': String(name) } : {}), ...headers }, fetch)
  return { status: res.status, body: await res.json() as { result?: any; error?: { code: number; message: string; data?: any } } }
}
async function legacy(method: string, params: Record<string, unknown> = {}, version = '2025-06-18') {
  const res = await post({ jsonrpc: '2.0', id: next++, method, params }, { 'MCP-Protocol-Version': version })
  return { status: res.status, body: await res.json() as { result?: any; error?: { code: number; message: string } } }
}
const svgOf = (result: any): string => result.content.find((c: any) => c.type === 'resource').resource.text

test('modern: discover, list, call; every result complete and signed by the server', async () => {
  const d = await modern('server/discover')
  assert.equal(d.status, 200)
  assert.deepEqual(d.body.result.supportedVersions, ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'])
  assert.equal(d.body.result.resultType, 'complete'); assert.equal(d.body.result._meta['io.modelcontextprotocol/serverInfo'].name, 'peepcraft')
  const list = await modern('tools/list')
  assert.deepEqual(list.body.result.tools.map((t: any) => t.name), ['describe', 'search_parts', 'render', 'random'])
  assert.equal(list.body.result.ttlMs, 3_600_000); assert.equal(list.body.result.cacheScope, 'public')
  assert.ok(list.body.result.tools.every((t: any) => t.annotations.readOnlyHint && t.inputSchema.type === 'object'))
  const r = await modern('tools/call', { name: 'render', arguments: { doc: doc('scene') } })
  assert.equal(r.status, 200); assert.equal(r.body.result.resultType, 'complete')
  assert.equal(svgOf(r.body.result), svg('scene'), 'the golden SVG, byte for byte')
  assert.match(r.body.result.structuredContent.shareUrl, /^https:\/\/peepcraft\.jinnux\.com\/#d=[\w-]+$/)
  assert.equal(r.body.result.structuredContent.fileName, 'scene_standing-afro-smile-crossed-arms-1_figure-runner_potted-plant.svg')
})

test('modern: headers must mirror the body', async () => {
  const noName = await post({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'describe', _meta: meta } }, { 'MCP-Protocol-Version': V, 'Mcp-Method': 'tools/call' })
  assert.equal(noName.status, 400); assert.equal((await noName.json()).error.code, -32020)
  const wrong = await modern('tools/list', {}, { 'Mcp-Method': 'tools/call' })
  assert.equal(wrong.status, 400); assert.equal(wrong.body.error!.code, -32020)
  const version = await modern('tools/list', {}, { 'MCP-Protocol-Version': '2025-11-25' })
  assert.equal(version.status, 400); assert.equal(version.body.error!.code, -32020)
  // A name outside plain ASCII may come in the base64 sentinel form.
  const b64 = await modern('tools/call', { name: 'describe', arguments: {} }, { 'Mcp-Name': `=?base64?${btoa('describe')}?=` })
  assert.equal(b64.status, 200)
})

test('modern: an unknown version lists the supported ones; an unknown method is 404', async () => {
  const res = await post({ jsonrpc: '2.0', id: 9, method: 'tools/list', params: { _meta: { ...meta, 'io.modelcontextprotocol/protocolVersion': '2099-01-01' } } }, { 'MCP-Protocol-Version': '2099-01-01', 'Mcp-Method': 'tools/list' })
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error.code, -32022); assert.equal(body.error.data.requested, '2099-01-01'); assert.ok(body.error.data.supported.includes(V))
  const nope = await modern('prompts/list')
  assert.equal(nope.status, 404); assert.equal(nope.body.error!.code, -32601)
})

test('legacy: initialize without a session, then tools as before', async () => {
  const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'old', version: '1' } } })
  assert.equal(init.status, 200); assert.equal(init.headers.get('Mcp-Session-Id'), null, 'no session is minted')
  const result = (await init.json()).result
  assert.equal(result.protocolVersion, '2025-06-18'); assert.deepEqual(result.capabilities, { tools: {}, resources: {} }); assert.match(result.instructions, /describe/)
  const unknown = await post({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2024-11-05' } })
  assert.equal((await unknown.json()).result.protocolVersion, '2025-11-25', 'an older ask gets the newest legacy version')
  const note = await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, { 'MCP-Protocol-Version': '2025-06-18' })
  assert.equal(note.status, 202); assert.equal(await note.text(), '')
  assert.deepEqual((await legacy('ping')).body.result, {})
  const list = await legacy('tools/list')
  assert.equal(list.body.result.tools.length, 4); assert.equal(list.body.result.resultType, undefined)
  const r = await legacy('tools/call', { name: 'render', arguments: { doc: doc('sitting') } })
  assert.equal(svgOf(r.body.result), svg('sitting'))
  const noHeader = await post({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} })
  assert.equal(noHeader.status, 200, 'no header: served as 2025-03-26')
  assert.equal((await legacy('nope')).body.error!.code, -32601)
})

test('tools: a bad document comes back as a tool error with paths and choices; an unknown tool is a protocol error', async () => {
  const bad = await modern('tools/call', { name: 'render', arguments: { doc: { v: 1, parts: { head: 'afroo' }, ink: 'red' } } })
  assert.equal(bad.status, 200); assert.equal(bad.body.result.isError, true)
  assert.deepEqual(bad.body.result.structuredContent.errors.map((e: any) => e.path), ['ink', 'parts.head'])
  assert.match(bad.body.result.content[0].text, /parts\.head: no head "afroo" \(choices: afro, /)
  const tool = await modern('tools/call', { name: 'draw', arguments: {} })
  assert.equal(tool.body.error!.code, -32602)
  const keep = await modern('tools/call', { name: 'random', arguments: { keep: { v: 1, parts: { head: 'zzz' } } } })
  assert.equal(keep.body.result.isError, true); assert.equal(keep.body.result.structuredContent.errors[0].path, 'keep.parts.head')
})

test('tools: search, describe and a seeded random', async () => {
  const s = await modern('tools/call', { name: 'search_parts', arguments: { category: 'head', query: 'afro' } })
  assert.deepEqual(s.body.result.structuredContent.items.map((i: any) => i.id), ['afro', 'long-afro'])
  const d = await modern('tools/call', { name: 'describe', arguments: {} })
  assert.deepEqual(d.body.result.structuredContent.types, ['standing', 'sitting', 'bust'])
  const a = await modern('tools/call', { name: 'random', arguments: { seed: 7, type: 'sitting' } })
  const b = await modern('tools/call', { name: 'random', arguments: { seed: 7, type: 'sitting' } })
  assert.deepEqual(a.body.result.structuredContent, b.body.result.structuredContent)
  const drawn = await modern('tools/call', { name: 'render', arguments: { doc: a.body.result.structuredContent.doc } })
  assert.equal(drawn.body.result.isError, undefined)
})

test('resources: the catalogue and the schema; an unknown one is invalid params', async () => {
  const list = await modern('resources/list')
  assert.deepEqual(list.body.result.resources.map((r: any) => r.uri), ['peepcraft://catalog', 'peepcraft://doc-schema'])
  const cat = await modern('resources/read', { uri: 'peepcraft://catalog' })
  assert.ok(JSON.parse(cat.body.result.contents[0].text).items.length > 200)
  const none = await modern('resources/read', { uri: 'peepcraft://nope' })
  assert.equal(none.body.error!.code, -32602)
})

test('HTTP: POST only, JSON only, one message, CORS for browser clients, origins when restricted', async () => {
  const at = (init: RequestInit, opts = options) => handle(new Request('https://x/mcp', init), opts)
  assert.equal((await at({ method: 'GET' })).status, 405)
  assert.equal((await at({ method: 'DELETE' })).status, 405)
  const pre = await at({ method: 'OPTIONS', headers: { Origin: 'http://localhost:6274' } })
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'http://localhost:6274')
  assert.match(pre.headers.get('Access-Control-Allow-Headers')!, /Mcp-Method/)
  assert.equal((await at({ method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status, 415)
  assert.equal((await post('{')).status, 400)
  const batch = await post([{ jsonrpc: '2.0', id: 1, method: 'ping' }])
  assert.equal(batch.status, 400); assert.match((await batch.json()).error.message, /batches/)
  assert.equal((await post('x'.repeat(70_000))).status, 413)
  const closed = { ...options, origins: 'https://claude.ai' }
  assert.equal((await at({ method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }, closed)).status, 403)
  assert.equal((await handle(new Request('https://x/'), options)).status, 200)
  assert.equal((await handle(new Request('https://x/other'), options)).status, 404)
})

test('the built Worker bundle draws the golden SVGs too, within the size budget', async () => {
  execFileSync('node', [new URL('build.mjs', import.meta.url).pathname], { stdio: 'pipe' })
  const worker = (await import(new URL('dist/worker.js', import.meta.url).href)).default as { fetch: (r: Request, env: object) => Promise<Response> }
  const limited = { LIMITER: { limit: async () => ({ success: false }) } }
  const fetch = (env: object) => (r: Request) => worker.fetch(r, env)
  for (const name of ['start', 'aura', 'figure']) {
    const r = await modern('tools/call', { name: 'render', arguments: { doc: doc(name) } }, {}, fetch({}))
    assert.equal(svgOf(r.body.result), svg(name), name)
  }
  const over = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}, fetch(limited))
  assert.equal(over.status, 429)
})
