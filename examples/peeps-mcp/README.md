# PeepCraft MCP server

An MCP server that lets an AI agent draw PeepCraft pictures: the same document, checks and SVG as the web app and the CLI (`@kit/peeps-engine`; the tests compare its output, and the built Worker bundle's, against the engine's golden files). It runs as a Cloudflare Worker over Streamable HTTP, stateless, read-only: nothing is stored, nothing is fetched.

**Endpoint (once deployed):** `https://peepcraft-mcp.jinnux.com/mcp`

| Tool | Does |
|---|---|
| `describe` | the document format: types, slots per type, defaults, ratios, limits, two examples |
| `search_parts` | ids by category (`head`, `face`, ..., `figure`, `thing`), type and words, with the pieces each can colour |
| `render` | checks a document and returns the SVG (an embedded `image/svg+xml` resource), a share link that opens it in PeepCraft, and its file name; with `preview: true` also a 512 px PNG on white (`image` content, no glow on the Aura extra); a bad document comes back as a tool error listing each problem with its path and the choices |
| `random` | a random document: only the open parts roll, the rest is PeepCraft's start unless `keep` sets it; a piece colour in `keep` rolls among the items that have it; contradictions are errors (`seed` repeats it) |

Resources: `peepcraft://catalog` (everything a document can name) and `peepcraft://doc-schema` (the document as JSON Schema). Every tool is marked read-only and idempotent.

## Protocol
- **Modern, 2026-07-28:** each request carries its version in `params._meta`; the `MCP-Protocol-Version`, `Mcp-Method` and `Mcp-Name` headers must mirror the body (else `400`, `-32020`); an unknown version gets `400`, `-32022` with the supported list; an unknown method `404`, `-32601`; `server/discover` answers; results carry `resultType: "complete"`, the server's identity in `_meta`, and `ttlMs` / `cacheScope` on lists and reads.
- **Legacy, 2025-03-26 to 2025-11-25:** `initialize` is answered (the asked version if known, else 2025-11-25) and no session is minted, since nothing is kept between calls; `notifications/initialized` gets `202`; `ping` works; a request without the version header is taken as 2025-03-26.
- **Both:** one JSON response per request (no SSE), POST only (`GET` and `DELETE` are `405`), one message per POST (no batches), 64 KB per request, CORS open so browser clients such as MCP Inspector can call. `ALLOWED_ORIGINS` restricts browser origins (a disallowed one gets `403`); the default `*` allows any, as the server holds nothing private.

## Run and deploy
```bash
npm run build:mcp      # dist/worker.js and its size: 2.44 MB gzip today; fails over 2.8 MB (Workers Free takes 3 MB)
npm run dev:mcp        # the Worker in local workerd on http://localhost:8787/mcp
npx @modelcontextprotocol/inspector --cli http://localhost:8787/mcp --transport http --method tools/list
npm run deploy:mcp     # build, then wrangler deploy (needs a Cloudflare login; not run without the owner's go-ahead)
```
`wrangler.jsonc` sets the custom domain `peepcraft-mcp.jinnux.com` (one level under the zone, so Universal SSL covers it), `PEEPCRAFT_URL` (the page share links open), and a rate limit of 60 requests a minute per address (the `LIMITER` binding; over it, `429`).

**Bot protection:** the `jinnux.com` zone challenges unknown clients (`403`, `cf-mitigated: challenge`), which MCP clients cannot pass, so they report `auth_required`. Either exempt `peepcraft-mcp.jinnux.com` (a WAF Skip rule; Bot Fight Mode on the Free plan applies to the whole zone) or use the `workers.dev` address, which `workers_dev: true` keeps on and which the zone's settings do not reach.

Connect Claude Code once deployed:
```bash
claude mcp add --transport http peepcraft https://peepcraft-mcp.jinnux.com/mcp
```

`server.ts` is the protocol (plain `fetch`, so the tests call it in Node), `tools.ts` the tools and resources, `schema.ts` the document as JSON Schema, `worker.ts` the Worker entry, `build.mjs` the bundle and its budget. No dependencies beyond the kit's own (`esbuild` builds; `wrangler` runs through `npx` for dev and deploy).
