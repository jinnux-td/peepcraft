# PeepCraft CLI

PeepCraft pictures from a terminal. It takes the same JSON document as the web app and the MCP server, checks it the same way, and draws the same SVG byte for byte (`@kit/peeps-engine`; the tests compare against the engine's golden files). It needs no network and no running web app.

```bash
npm run peeps -- parts head -q curly                  # what a document can name, with the pieces each can colour
npm run peeps -- random --type sitting --seed 7 > doc.json
npm run peeps -- render doc.json -o peep.svg          # or -o peep.png [--scale 2]; no -o: SVG to stdout
npm run peeps -- render - -o peep.svg < doc.json      # the document on stdin
npm run peeps -- share doc.json                       # a link that opens it in PeepCraft (--base for another page)
npm run peeps -- open 'https://peepcraft.jinnux.com/#d=...' > doc.json
npm run peeps -- render 'https://peepcraft.jinnux.com/#d=...' -o peep.png
```

- **Document:** `{ "v": 1 }` is what PeepCraft opens with; add `type`, `parts`, colours, `scene`, ... (`PeepcraftDoc` in `packages/peeps-engine/src/doc.ts`, and `kit/docs/peepcraft-platform.md` §3).
- **Errors:** one line per problem, with its path and the first choices: `parts.head: no head "afroo"; known: afro, bangs-2, ...`. A bad document exits with 1, a usage mistake with 2.
- **PNG:** 1024 px on the long side times `--scale` (1 to 4), transparent where the background is. It is drawn in headless Chromium through `playwright-core` (Apache-2.0, already the kit's browser driver), as the web app draws it on a canvas; install Chromium once with `npx playwright install chromium`. SVG needs no browser.
- **Files:** it writes only the `-o` file.

`cli.ts` takes the arguments and an io object (`run(argv, io)`), so `cli.test.ts` drives it in memory; `main.ts` wires it to the process; `png.ts` is the Chromium step.
