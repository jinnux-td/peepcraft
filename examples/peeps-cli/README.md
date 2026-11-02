# PeepCraft CLI

PeepCraft pictures from a terminal. It takes the same JSON document as the web app and the MCP server, checks it the same way, and draws the same SVG byte for byte (`@kit/peeps-engine`; the tests compare against the engine's golden files). It needs no network and no running web app.

```bash
npm run peeps -- parts head -q curly                  # what a document can name, with the pieces each can colour
npm run peeps -- random --type sitting --seed 7 > doc.json
npm run peeps -- render doc.json --save               # ./bust-afro-smile-tee-1.svg, named as PeepCraft's Save names it
npm run peeps -- render doc.json --save --png --scale 2   # the same name, .png, 2048 px
npm run peeps -- render doc.json -o out/              # into a folder, same name
npm run peeps -- render doc.json -o peep.svg          # or a name of your own (.svg or .png); no -o: SVG to stdout
npm run peeps -- render - -o peep.svg < doc.json      # the document on stdin
npm run peeps -- share doc.json                       # a link that opens it in PeepCraft (--base for another page)
npm run peeps -- open 'https://peepcraft.jinnux.com/#d=...' > doc.json
npm run peeps -- render 'https://peepcraft.jinnux.com/#d=...' -o peep.png
```

- **Document:** `{ "v": 1 }` is what PeepCraft opens with; add `type`, `parts`, colours, `scene`, ... (`PeepCraftDoc` in `packages/peeps-engine/src/doc.ts`, and `kit/docs/peepcraft-platform.md` §3).
- **Errors:** one line per problem, with its path and the first choices: `parts.head: no head "afroo"; known: afro, bangs-2, ...`. A bad document exits with 1, a usage mistake with 2.
- **PNG:** 1024 px on the long side times `--scale` (1 to 4), transparent where the background is. It is drawn in headless Chromium through `playwright-core` (Apache-2.0, already the kit's browser driver), as the web app draws it on a canvas; install Chromium once with `npx playwright install chromium`. SVG needs no browser.
- **File names:** `--save` and `-o FOLDER` (an existing folder, or a path ending in `/`) name the file the way PeepCraft's Save button does: the type, then the parts head to toe and the extra, parts at `none` left out (`sitting-long-curly-smile-full-crossed-legs.svg`); a scene is `scene_` and each member in drawing order. `--png` picks PNG there. A name given with `-o` wins.
- **Files:** it writes only that one file.

`cli.ts` takes the arguments and an io object (`run(argv, io)`), so `cli.test.ts` drives it in memory; `main.ts` wires it to the process; `png.ts` is the Chromium step.
