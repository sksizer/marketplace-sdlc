/**
 * check-diagrams.mjs — assert no diagram label escapes its box or the viewBox.
 *
 *   node scripts/check-diagrams.mjs [file.html|file.svg ...]
 *
 * With no arguments it renders the stress payloads below, which are built to
 * defeat even layout: labels far longer than an even share of the row, notes
 * that double a cell's width, a single wide box beside narrow ones. With
 * arguments it checks already-rendered files instead.
 *
 * This is the guarantee explore-codebase advertises — that a payload cannot
 * produce an SVG which overflows its box — held to mechanically.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL = join(ROOT, 'src/marketplaces/sdlc/plugins/codebase/skills/explore-codebase')

/** Must match the renderer's own estimate, or this proves nothing. */
const textWidth = (/** @type {string} */ s, /** @type {number} */ size) => s.length * size * 0.58

/** @returns {string[]} one message per label that does not fit. */
export function findOverflows(/** @type {string} */ source, /** @type {string} */ label = '') {
  const out = []
  const svgs = source.match(/<svg[\s\S]*?<\/svg>/g) ?? []
  svgs.forEach((svg, n) => {
    const vbw = Number(svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+)/)?.[1] ?? 0)
    const rects = [...svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)]
      .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }))
    for (const m of svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"([^>]*)>([^<]*)<\/text>/g)) {
      const [, xs, ys, attrs, raw] = m
      if (/text-anchor="middle"/.test(attrs)) continue // centred labels carry their own backing plate
      const x = +xs
      const y = +ys
      const size = Number(attrs.match(/font-size="([\d.]+)"/)?.[1] ?? 12)
      const text = raw.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      const right = x + textWidth(text, size)
      const where = `${label}#${n}`
      if (right > vbw + 0.5) {
        out.push(`${where}: "${text}" runs to ${right.toFixed(0)}, past the ${vbw} viewBox`)
        continue
      }
      // The enclosing box, if this label sits in one rather than in the backdrop.
      const host = rects.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h && r.w < vbw * 0.98)
      if (host && right > host.x + host.w - 2) {
        out.push(`${where}: "${text}" runs to ${right.toFixed(0)}, past its box at ${(host.x + host.w).toFixed(0)}`)
      }
    }
  })
  return out
}

const box = (/** @type {string} */ title, /** @type {string[]} */ lines) => ({ title, lines })

export const STRESS = {
  'layers: one row mixes a very wide box with narrow ones': {
    kind: 'layers',
    boundary: { after: 0, label: 'a boundary label long enough to need its own backing plate' },
    layers: [
      { label: 'TOP', boxes: [box('a', ['short']), box('b', ['a description that is very considerably longer than an even share of this row'])] },
      { boxes: [box('sole-occupant-of-the-row-with-a-long-name', ['and a second line that also runs long enough to matter'])] },
    ],
  },
  'pipeline: seven stages, the last the widest': {
    kind: 'pipeline',
    stages: [
      box('one', ['x']), box('two', ['x']), box('three', ['x']), box('four', ['x']),
      box('five', ['x']), box('six', ['x']),
      box('seven-is-the-longest', ['and carries the longest line of all of them']),
    ],
    outputs: { label: 'OUT', boxes: [box('first-output-path/', ['a']), box('b/', ['b'])] },
  },
  'inventory: long names and long notes in every column': {
    kind: 'inventory',
    label: 'a container whose label is itself quite long',
    sublabel: 'and a sublabel that is longer still, to push the header out',
    columns: 5,
    items: Array.from({ length: 11 }, (_, i) => ({
      name: `member_number_${i}`,
      note: i % 3 === 0 ? 'with an explanatory note attached' : undefined,
      accent: i === 4 ? 'bad' : undefined,
    })),
  },
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2)
  let problems = []
  let checked = 0
  if (files.length) {
    for (const f of files) {
      problems.push(...findOverflows(readFileSync(f, 'utf8'), f))
      checked++
    }
  } else {
    const { renderDiagram, validate } = await import(join(SKILL, 'render_map.mjs'))
    for (const [name, diagram] of Object.entries(STRESS)) {
      validate({ title: 't', lede: 'l', sections: [{ heading: 'h', blocks: [{ type: 'figure', diagram }] }] })
      problems.push(...findOverflows(renderDiagram(diagram), name))
      checked++
    }
  }
  if (problems.length) {
    console.error(`DIAGRAM-CHECK fail ${problems.length} overflowing labels`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }
  console.error(`DIAGRAM-CHECK ok checked=${checked} no label overflows its box or the viewBox`)
}
