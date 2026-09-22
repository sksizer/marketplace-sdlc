/**
 * render_map.mjs — turn a MapPage payload into one self-contained HTML page.
 *
 *   node render_map.mjs <payload.json> <out.html>
 *
 * The contract is `map-page.schema.json` beside this file. The payload carries
 * content and diagram DATA; every pixel decision lives here, so improving a
 * layout improves every page ever rendered and no caller can emit an SVG that
 * overflows, overlaps, or disappears in dark mode.
 *
 * No dependencies. Typed with JSDoc so `tsc --checkJs --noEmit` covers it
 * without a build step standing between the source and what ships.
 *
 * @typedef {{ title: string, lines?: string[], accent?: Accent }} Box
 * @typedef {'none'|'good'|'warn'|'bad'} Accent
 * @typedef {{ label?: string, boxes: Box[] }} Layer
 * @typedef {{ kind:'layers', layers: Layer[], boundary?: {after:number,label:string}, arrows?: 'none'|'down' }} Layers
 * @typedef {{ kind:'pipeline', stages: Box[], outputs?: {label:string,boxes:Box[]} }} Pipeline
 * @typedef {{ kind:'inventory', label:string, sublabel?:string, columns?:number,
 *             items:{name:string,note?:string,accent?:Accent}[] }} Inventory
 * @typedef {{ kind:'raw', svg:string, viewBox:string }} Raw
 * @typedef {Layers|Pipeline|Inventory|Raw} Diagram
 * @typedef {{type:'p',text:string}
 *          |{type:'ul',items:string[]}
 *          |{type:'table',head:string[],rows:string[][]}
 *          |{type:'panel',heading:string,blocks:Block[]}
 *          |{type:'figure',caption:string,cite?:string,diagram:Diagram}} Block
 * @typedef {{ heading:string, blocks: Block[] }} Section
 * @typedef {{ title:string, lede:string, meta?:string, sections:Section[] }} MapPage
 */

import { readFileSync, writeFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const esc = (/** @type {string} */ s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Escape first, then re-introduce the two marks the payload may use. */
const inline = (/** @type {string} */ s) =>
  esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

const ACCENT = { none: 'var(--r-border)', good: 'var(--r-success)', warn: 'var(--r-warning)', bad: 'var(--r-error)' }
const stroke = (/** @type {Accent=} */ a) => ACCENT[a ?? 'none'] ?? ACCENT.none

/**
 * Character-width estimate at a given font size, for monospace-ish SVG labels.
 * Deliberately generous: a box that is too wide reads fine, one that is too
 * narrow clips its own text.
 */
const textWidth = (/** @type {string} */ s, /** @type {number} */ size) => s.length * size * 0.58

// ---------------------------------------------------------------------------
// SVG primitives — every colour is a token so both themes work
// ---------------------------------------------------------------------------

const ARROW_DEFS = `<defs>
<marker id="mp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
<path d="M0,0 L10,5 L0,10 z" fill="var(--r-muted)"/></marker></defs>`

/** @returns {string} */
function boxSvg(/** @type {Box} */ box, /** @type {number} */ x, /** @type {number} */ y,
                /** @type {number} */ w, /** @type {number} */ h) {
  const lines = box.lines ?? []
  const titleY = lines.length ? y + 24 : y + h / 2 + 5
  const parts = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--r-card)" stroke="${stroke(box.accent)}" stroke-width="${box.accent && box.accent !== 'none' ? 1.5 : 1}"/>`,
    `<text x="${x + 14}" y="${titleY}" fill="var(--r-heading)" font-size="13">${esc(box.title)}</text>`,
  ]
  lines.forEach((l, i) => {
    parts.push(`<text x="${x + 14}" y="${titleY + 19 + i * 16}" fill="var(--r-muted)" font-size="11">${esc(l)}</text>`)
  })
  return parts.join('')
}

const boxHeight = (/** @type {Box} */ b) => (b.lines?.length ? 34 + b.lines.length * 16 : 44)

/** Width a row of boxes needs, laid out evenly across `total`. */
function rowLayout(/** @type {Box[]} */ boxes, /** @type {number} */ total, /** @type {number} */ gap) {
  const w = (total - gap * (boxes.length - 1)) / boxes.length
  return boxes.map((b, i) => ({ box: b, x: i * (w + gap), w }))
}

// ---------------------------------------------------------------------------
// Diagram kinds
// ---------------------------------------------------------------------------

const W = 880 // viewBox width every diagram is laid out against
const PAD = 16

/** @returns {string} */
function renderLayers(/** @type {Layers} */ d) {
  const gap = 20
  const inner = W - PAD * 2
  const arrows = (d.arrows ?? 'down') === 'down'
  let y = PAD
  const parts = [ARROW_DEFS]

  d.layers.forEach((layer, li) => {
    if (layer.label) {
      parts.push(`<text x="${PAD}" y="${y + 12}" fill="var(--r-muted)" font-size="11.5" font-family="var(--r-font)">${esc(layer.label)}</text>`)
      y += 22
    }
    const h = Math.max(...layer.boxes.map(boxHeight))
    for (const { box, x, w } of rowLayout(layer.boxes, inner, gap)) {
      parts.push(boxSvg(box, PAD + x, y, w, h))
    }
    y += h

    const last = li === d.layers.length - 1
    if (!last) {
      const isBoundary = d.boundary && d.boundary.after === li
      if (isBoundary) {
        y += 18
        parts.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="var(--r-error)" stroke-width="1.5" stroke-dasharray="6 4"/>`)
        const label = /** @type {{after:number,label:string}} */ (d.boundary).label
        const lw = textWidth(label, 11.5) + 24
        parts.push(`<rect x="${(W - lw) / 2}" y="${y - 12}" width="${lw}" height="24" rx="4" fill="var(--r-bg)"/>`)
        parts.push(`<text x="${W / 2}" y="${y + 4}" text-anchor="middle" fill="var(--r-error)" font-size="11.5" font-family="var(--r-font)">${esc(label)}</text>`)
        y += 22
      } else if (arrows) {
        parts.push(`<line x1="${W / 2}" y1="${y + 6}" x2="${W / 2}" y2="${y + 28}" stroke="var(--r-muted)" stroke-width="1.5" marker-end="url(#mp-arrow)"/>`)
        y += 34
      } else {
        y += 20
      }
    }
  })
  return svgWrap(parts.join(''), y + PAD)
}

/** @returns {string} */
function renderPipeline(/** @type {Pipeline} */ d) {
  const gap = 34
  const inner = W - PAD * 2
  const h = Math.max(...d.stages.map(boxHeight))
  const parts = [ARROW_DEFS]
  const laid = rowLayout(d.stages, inner, gap)
  for (const { box, x, w } of laid) {
    parts.push(boxSvg(box, PAD + x, PAD, w, h))
  }
  // one arrow in each gap
  for (let i = 0; i < laid.length - 1; i++) {
    const from = PAD + laid[i].x + laid[i].w
    parts.push(`<line x1="${from + 6}" y1="${PAD + h / 2}" x2="${from + gap - 6}" y2="${PAD + h / 2}" stroke="var(--r-muted)" stroke-width="1.5" marker-end="url(#mp-arrow)"/>`)
  }
  let y = PAD + h

  if (d.outputs) {
    y += 34
    parts.push(`<text x="${PAD}" y="${y}" fill="var(--r-muted)" font-size="11.5" font-family="var(--r-font)">${esc(d.outputs.label)}</text>`)
    y += 14
    const oh = Math.max(...d.outputs.boxes.map(boxHeight))
    for (const { box, x, w } of rowLayout(d.outputs.boxes, inner, 18)) {
      parts.push(boxSvg(box, PAD + x, y, w, oh))
    }
    y += oh
  }
  return svgWrap(parts.join(''), y + PAD)
}

/** @returns {string} */
function renderInventory(/** @type {Inventory} */ d) {
  const cols = d.columns ?? 5
  const inner = W - PAD * 2
  const colW = (inner - 28) / cols
  const rows = Math.ceil(d.items.length / cols)
  let top = PAD
  const parts = []

  const headH = d.sublabel ? 46 : 28
  const bodyH = headH + rows * 22 + 16
  parts.push(`<rect x="${PAD}" y="${top}" width="${inner}" height="${bodyH}" rx="6" fill="var(--r-accent-wash)" stroke="var(--r-accent-line)" stroke-width="1.5"/>`)
  parts.push(`<text x="${PAD + 18}" y="${top + 24}" fill="var(--r-heading)" font-size="14">${esc(d.label)}</text>`)
  if (d.sublabel) {
    parts.push(`<text x="${PAD + 18}" y="${top + 42}" fill="var(--r-muted)" font-size="11" font-family="var(--r-font)">${esc(d.sublabel)}</text>`)
  }
  d.items.forEach((item, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const x = PAD + 18 + c * colW
    const y = top + headH + 20 + r * 22
    const fill = item.accent && item.accent !== 'none' ? stroke(item.accent) : 'var(--r-heading)'
    parts.push(`<text x="${x}" y="${y}" fill="${fill}" font-size="11.5">${esc(item.name)}</text>`)
    if (item.note) {
      parts.push(`<text x="${x + textWidth(item.name, 11.5) + 8}" y="${y}" fill="var(--r-muted)" font-size="10" font-family="var(--r-font)">${esc(item.note)}</text>`)
    }
  })
  return svgWrap(parts.join(''), top + bodyH + PAD)
}

const svgWrap = (/** @type {string} */ inner, /** @type {number} */ height, /** @type {string=} */ viewBox) =>
  `<svg viewBox="${viewBox ?? `0 0 ${W} ${Math.round(height)}`}" role="img" font-family="var(--r-font-mono)">${inner}</svg>`

/** @returns {string} */
function renderDiagram(/** @type {Diagram} */ d) {
  switch (d.kind) {
    case 'layers': return renderLayers(d)
    case 'pipeline': return renderPipeline(d)
    case 'inventory': return renderInventory(d)
    case 'raw': return svgWrap(d.svg, 0, d.viewBox)
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** @returns {string} */
function renderBlock(/** @type {Block} */ b) {
  switch (b.type) {
    case 'p':
      return `<p>${inline(b.text)}</p>`
    case 'ul':
      return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`
    case 'table':
      return `<table><thead><tr>${b.head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>` +
        `<tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    case 'panel':
      return `<div class="panel"><h3>${inline(b.heading)}</h3>${b.blocks.map(renderBlock).join('')}</div>`
    case 'figure':
      return `<figure>${renderDiagram(b.diagram)}<figcaption>${inline(b.caption)}` +
        `${b.cite ? ` <span class="cite">${esc(b.cite)}</span>` : ''}</figcaption></figure>`
  }
}

// ---------------------------------------------------------------------------
// Validation — enough to fail loudly on the mistakes that actually happen
// ---------------------------------------------------------------------------

const DIAGRAM_KINDS = new Set(['layers', 'pipeline', 'inventory', 'raw'])
const BLOCK_TYPES = new Set(['p', 'ul', 'table', 'panel', 'figure'])

/** @param {unknown} payload @returns {MapPage} */
function validate(payload) {
  /** @type {string[]} */
  const errors = []
  const at = (/** @type {string} */ path, /** @type {string} */ msg) => errors.push(`${path}: ${msg}`)

  const page = /** @type {any} */ (payload)
  if (!page || typeof page !== 'object') throw new Error('payload must be an object')
  if (typeof page.title !== 'string') at('title', 'required string')
  if (typeof page.lede !== 'string') at('lede', 'required string')
  if (!Array.isArray(page.sections)) at('sections', 'required array')

  /** @param {any} b @param {string} path */
  const checkBlock = (b, path) => {
    if (!b || !BLOCK_TYPES.has(b.type)) return at(path, `type must be one of ${[...BLOCK_TYPES].join(', ')}`)
    if (b.type === 'table') {
      const cols = b.head?.length
      b.rows?.forEach((/** @type {any[]} */ r, /** @type {number} */ i) => {
        if (r.length !== cols) at(`${path}.rows[${i}]`, `has ${r.length} cells, head has ${cols}`)
      })
    }
    if (b.type === 'panel') b.blocks?.forEach((/** @type {any} */ x, /** @type {number} */ i) => checkBlock(x, `${path}.blocks[${i}]`))
    if (b.type === 'figure') {
      const d = b.diagram
      if (!d || !DIAGRAM_KINDS.has(d.kind)) return at(`${path}.diagram`, `kind must be one of ${[...DIAGRAM_KINDS].join(', ')}`)
      if (d.kind === 'layers') {
        if (!d.layers?.length) at(`${path}.diagram.layers`, 'needs at least one layer')
        d.layers?.forEach((/** @type {any} */ l, /** @type {number} */ i) => {
          if (!l.boxes?.length) at(`${path}.diagram.layers[${i}]`, 'needs at least one box')
        })
        if (d.boundary && (d.boundary.after < 0 || d.boundary.after >= (d.layers?.length ?? 0) - 1)) {
          at(`${path}.diagram.boundary.after`, 'must index a layer that has another layer below it')
        }
      }
      if (d.kind === 'pipeline' && !d.stages?.length) at(`${path}.diagram.stages`, 'needs at least one stage')
      if (d.kind === 'inventory' && !d.items?.length) at(`${path}.diagram.items`, 'needs at least one item')
      if (d.kind === 'raw' && typeof d.viewBox !== 'string') at(`${path}.diagram.viewBox`, 'raw needs an explicit viewBox')
    }
  }

  page.sections?.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
    if (typeof s.heading !== 'string') at(`sections[${i}].heading`, 'required string')
    if (!Array.isArray(s.blocks)) return at(`sections[${i}].blocks`, 'required array')
    s.blocks.forEach((/** @type {any} */ b, /** @type {number} */ j) => checkBlock(b, `sections[${i}].blocks[${j}]`))
  })

  if (errors.length) throw new Error(`invalid MapPage payload:\n  ${errors.join('\n  ')}`)
  return page
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STYLE = `
:root {
  --r-font: -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', sans-serif;
  --r-font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', Menlo, monospace;
  --r-bg: #f8f8fa; --r-card: #ffffff; --r-surface: #ebebed; --r-chip: #f1f1f5;
  --r-heading: #1a1a1c; --r-text: #45454b; --r-muted: #606066; --r-border: #e0e0e6;
  --r-accent-wash: #e6ebf7; --r-accent-line: #abc0ee;
  --r-success: #196b3a; --r-warning: #865408; --r-error: #a20717;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --r-bg: #16161a; --r-card: #1f1f25; --r-surface: #26262d; --r-chip: #26262d;
    --r-heading: #f2f2f5; --r-text: #c6c6cf; --r-muted: #93939e; --r-border: #33333c;
    --r-accent-wash: #1e2740; --r-accent-line: #3c5490;
    --r-success: #5fcf8e; --r-warning: #e0b264; --r-error: #f2919d;
  }
}
:root[data-theme="dark"] {
  --r-bg: #16161a; --r-card: #1f1f25; --r-surface: #26262d; --r-chip: #26262d;
  --r-heading: #f2f2f5; --r-text: #c6c6cf; --r-muted: #93939e; --r-border: #33333c;
  --r-accent-wash: #1e2740; --r-accent-line: #3c5490;
  --r-success: #5fcf8e; --r-warning: #e0b264; --r-error: #f2919d;
}
* { box-sizing: border-box; }
body { margin:0; padding:48px 16px 96px; background:var(--r-bg); color:var(--r-text);
  font-family:var(--r-font); font-size:16px; line-height:1.65; }
main { max-width:900px; margin:0 auto; }
h1 { color:var(--r-heading); font-size:30px; margin:0 0 6px; letter-spacing:-0.01em; }
h2 { color:var(--r-heading); font-size:21px; margin:52px 0 12px; letter-spacing:-0.005em; }
h3 { color:var(--r-heading); font-size:15.5px; margin:0 0 8px; }
.lede { color:var(--r-muted); font-size:17px; margin:0 0 6px; }
.meta { color:var(--r-muted); font-size:13px; font-family:var(--r-font-mono); margin-bottom:36px; }
p { margin:0 0 15px; }
code { font-family:var(--r-font-mono); font-size:0.875em; background:var(--r-chip);
  border-radius:4px; padding:1.5px 5px; color:var(--r-heading); }
figure { margin:26px 0; }
figure svg { width:100%; height:auto; display:block; }
figcaption { color:var(--r-muted); font-size:13.5px; margin-top:9px; }
table { width:100%; border-collapse:collapse; margin:18px 0; font-size:14.5px; }
th,td { text-align:left; padding:8px 12px; border-bottom:1px solid var(--r-border); vertical-align:top; }
th { background:var(--r-surface); color:var(--r-heading); font-weight:600; }
ul { margin:0 0 15px; padding-left:21px; } li { margin-bottom:6px; }
.panel { border:1px solid var(--r-accent-line); background:var(--r-accent-wash);
  border-radius:6px; padding:14px 18px; margin:22px 0; }
.panel > :last-child { margin-bottom:0; }
.cite { font-family:var(--r-font-mono); font-size:12.5px; color:var(--r-muted); }
@media (max-width:620px) { body { padding:32px 16px 64px; } h1 { font-size:25px; } }
`

/** @param {MapPage} page @returns {string} */
export function renderMapPage(page) {
  const body = page.sections
    .map((s) => `<h2>${inline(s.heading)}</h2>\n${s.blocks.map(renderBlock).join('\n')}`)
    .join('\n\n')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — structural map</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>${esc(page.title)}</h1>
<p class="lede">${inline(page.lede)}</p>
${page.meta ? `<p class="meta">${esc(page.meta)}</p>` : ''}

${body}
</main>
</body>
</html>
`
}

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('usage: node render_map.mjs <payload.json> <out.html>')
  process.exit(2)
}
const page = validate(JSON.parse(readFileSync(input, 'utf8')))
writeFileSync(output, renderMapPage(page))
console.error(`MAP-RENDER ok sections=${page.sections.length} out=${output}`)
