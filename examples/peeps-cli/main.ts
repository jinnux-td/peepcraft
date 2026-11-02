#!/usr/bin/env node
// The `peep` command: npm run peep -- <command> in the kit repo, or `peep <command>` once the peepcraft package is installed. See `help`.
import { readFile, stat, writeFile } from 'node:fs/promises'
import { text } from 'node:stream/consumers'
import { run } from './cli.ts'

// Piped into a reader that stops early (`| head`): stop quietly, as other tools do.
process.stdout.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EPIPE') process.exit(0); throw e })

process.exitCode = await run(process.argv.slice(2), {
  out: (t) => process.stdout.write(t + '\n'),
  err: (t) => process.stderr.write(t + '\n'),
  stdin: () => text(process.stdin),
  readFile: (p) => readFile(p, 'utf8'),
  writeFile: (p, d) => writeFile(p, d),
  isDir: (p) => stat(p).then((s) => s.isDirectory(), () => false),
  // Chromium only loads when a PNG is asked for.
  png: async (svg, w, h) => (await import('./png.ts')).svgToPng(svg, w, h),
})
