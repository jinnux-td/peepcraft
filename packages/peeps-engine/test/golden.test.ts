// Golden pictures: each document in test/golden renders to the committed SVG next to it, byte for byte. The CLI and the MCP server compare
// against the same files, so the three hosts are proven to draw the same picture. After a deliberate change to the drawing:
//   UPDATE_GOLDEN=1 npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { boxes, boxKey, boxKeys, renderSvg } from '../src/index.ts'

const dir = new URL('./golden/', import.meta.url)
const docs = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()

for (const file of docs) {
  test(`golden: ${file}`, async () => {
    const { svg } = await renderSvg(JSON.parse(readFileSync(new URL(file, dir), 'utf8')))
    const target = new URL(file.replace(/\.json$/, '.svg'), dir)
    if (process.env.UPDATE_GOLDEN) writeFileSync(target, svg)
    assert.equal(svg, readFileSync(target, 'utf8'))
  })
}

test('every look the creator frames has a measured outline (npm run measure:peeps)', () => {
  const missing = boxKeys().map(boxKey).filter((k) => !boxes[k])
  assert.deepEqual(missing, [])
  assert.equal(Object.keys(boxes).length, boxKeys().length, 'no outline for a look that is gone')
})
