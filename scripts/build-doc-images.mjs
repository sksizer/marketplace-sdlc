/**
 * build-doc-images.mjs — render docs/examples/*.json into docs/images/*.svg.
 *
 *   node scripts/build-doc-images.mjs [--check]
 *
 * Each example is `{ name, caption, diagram }`. The diagram is rendered by the
 * skill's own renderer, so a doc image cannot show a shape the renderer will not
 * actually produce. `--check` fails instead of writing, for CI.
 *
 * The renderer paints in `var(--r-*)`, which a standalone SVG has no stylesheet
 * to resolve — and hosts that serve SVG under a strict CSP may drop an embedded
 * <style> anyway. So the tokens are substituted literally here, once per scheme,
 * and each example ships as a light/dark pair for <picture> to choose between.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findOverflows } from './check-diagrams.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL = join(ROOT, 'src/marketplaces/sdlc/plugins/codebase/skills/explore-codebase')
const EXAMPLES = join(ROOT, 'docs/examples')
const IMAGES = join(ROOT, 'docs/images')

const { TOKENS, renderDiagram, validate } = await import(join(SKILL, 'render_map.mjs'))

/** The `--r-*` declarations of one CSS rule, as a plain map. */
function tokensOf(/** @type {string} */ selector) {
  const at = TOKENS.indexOf(selector)
  if (at < 0) throw new Error(`no ${selector} rule in TOKENS`)
  const block = TOKENS.slice(TOKENS.indexOf('{', at) + 1, TOKENS.indexOf('}', at))
  return Object.fromEntries([...block.matchAll(/(--r-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

const LIGHT = tokensOf(':root {')
const DARK = { ...LIGHT, ...tokensOf(':root[data-theme="dark"] {') }

/** Substitutes every var() with its literal value, so the file stands alone. */
function resolveVars(/** @type {string} */ svg, /** @type {Record<string,string>} */ tokens) {
  const out = svg.replace(/var\((--r-[\w-]+)\)/g, (_, name) => {
    const v = tokens[name]
    if (v === undefined) throw new Error(`unknown token ${name}`)
    return v
  })
  const leftover = out.match(/var\(--[\w-]+\)/)
  if (leftover) throw new Error(`unresolved ${leftover[0]}`)
  return out
}

/** Gives the rendered fragment the root attributes a standalone file needs. */
function standalone(/** @type {string} */ svg, /** @type {string} */ title) {
  const box = svg.match(/viewBox="([\d.\s-]+)"/)
  if (!box) throw new Error('rendered diagram has no viewBox')
  const [, , w, h] = box[1].trim().split(/\s+/).map(Number)
  return svg.replace(
    '<svg ',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `,
  ).replace('>', `><title>${title.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</title>`)
}

const check = process.argv.includes('--check')
mkdirSync(IMAGES, { recursive: true })
let wrote = 0
let stale = []

for (const file of readdirSync(EXAMPLES).filter((f) => f.endsWith('.json')).sort()) {
  const ex = JSON.parse(readFileSync(join(EXAMPLES, file), 'utf8'))
  // Round-trip through the real validator: a doc example must be a legal payload.
  validate({
    title: ex.name,
    lede: ex.caption,
    sections: [{ heading: ex.name, blocks: [{ type: 'figure', diagram: ex.diagram, caption: ex.caption }] }],
  })
  const svg = renderDiagram(ex.diagram)
  // A doc image that clips its own labels would teach the wrong thing.
  const bad = findOverflows(svg, ex.name)
  if (bad.length) {
    console.error(`${ex.name}: ${bad.length} overflowing labels\n  ${bad.join('\n  ')}`)
    process.exit(1)
  }
  for (const [scheme, tokens] of [['light', LIGHT], ['dark', DARK]]) {
    const out = join(IMAGES, `${ex.name}-${scheme}.svg`)
    const body = standalone(resolveVars(svg, tokens), ex.caption) + '\n'
    let prev = null
    try { prev = readFileSync(out, 'utf8') } catch {}
    if (prev === body) continue
    if (check) stale.push(out.slice(ROOT.length + 1))
    else { writeFileSync(out, body); wrote++ }
  }
}

if (check && stale.length) {
  console.error(`doc images are stale, run: node scripts/build-doc-images.mjs\n  ${stale.join('\n  ')}`)
  process.exit(1)
}
console.error(check ? 'DOC-IMAGES ok up to date' : `DOC-IMAGES ok wrote=${wrote}`)
