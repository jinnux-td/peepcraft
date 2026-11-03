#!/usr/bin/env node
// The `peep` command: npm run peep -- <command> in the kit repo, or `peep <command>` once the peepcraft package is installed. See `help`.
import { readFile, stat, writeFile } from 'node:fs/promises'
import { text } from 'node:stream/consumers'
import { run } from './cli.ts'

// Piped into a reader that stops early (`| head`): stop quietly, as other tools do.
process.stdout.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EPIPE') process.exit(0); throw e })

process.exitCode = await run(process.argv.slice(2), {
  color: !!process.stdout.isTTY && !process.env.NO_COLOR,
  out: (t) => process.stdout.write(t + '\n'),
  err: (t) => process.stderr.write(t + '\n'),
  stdin: () => text(process.stdin),
  readFile: (p) => readFile(p, 'utf8'),
  writeFile: (p, d) => writeFile(p, d),
  isDir: (p) => stat(p).then((s) => s.isDirectory(), () => false),
  // Chromium only loads when a PNG is asked for.
  png: async (svg, w, h) => (await import('./png.ts')).svgToPng(svg, w, h),
  readBytes: (p) => readFile(p),
  // The Anthropic SDK only loads for from-image. Its credentials: ANTHROPIC_API_KEY, or a profile from `ant auth login`.
  perceive: async (request) => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    try {
      return await new Anthropic().beta.messages.create(request as Parameters<InstanceType<typeof Anthropic>['beta']['messages']['create']>[0] & { stream?: false })
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error('Claude refused the credentials; check ANTHROPIC_API_KEY or run ant auth login')
      if (e instanceof Anthropic.RateLimitError) throw new Error('Claude is rate limiting; try again in a minute')
      if (e instanceof Anthropic.BadRequestError) throw new Error(`Claude could not take the request: ${e.message}`)
      if (e instanceof Anthropic.APIError && e.status) throw new Error(`Claude answered ${e.status}; try again later`)
      // Anything else, a missing credential among them (the SDK throws a plain Error for that), with how to give one.
      throw new Error(`could not call Claude: ${(e as Error).message} (credentials: set ANTHROPIC_API_KEY, or run ant auth login)`)
    }
  },
})
