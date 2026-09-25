/**
 * import-docs.mjs — copy docs/ pages into the site before it builds.
 *
 *   node scripts/import-docs.mjs
 *
 * `docs/` is the source of truth: it reads correctly on GitHub with relative
 * links, and it is what a reader of the repository finds. The site is a second
 * surface for the same prose, so the page is copied rather than rewritten, and
 * the copy is generated — never edited, never committed.
 *
 * Two things have to change in the copy. Relative links into the repository
 * have no meaning once the page is served from the site, so they become
 * absolute GitHub URLs. And the diagram SVGs move into the site's static
 * directory, which sits behind the base path GitHub Pages serves under.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BLOB = 'https://github.com/sksizer/marketplace-sdlc/blob/main'
// The Pages workflow serves the site under /<repo>/; a local build serves at /.
const BASE = (process.env.SITE_BASE ?? '/').replace(/\/*$/, '/')

const PAGES = [
  {
    from: 'docs/diagrams.md',
    to: 'site/src/content/docs/diagrams.md',
    title: 'Structural diagrams',
    description: 'The diagrams explore-codebase draws, and the payload that produces each one.',
  },
]

const IMAGES_FROM = join(ROOT, 'docs/images')
const IMAGES_TO = join(ROOT, 'site/public/diagrams')

rmSync(IMAGES_TO, { recursive: true, force: true })
mkdirSync(IMAGES_TO, { recursive: true })
let copied = 0
for (const f of readdirSync(IMAGES_FROM).filter((f) => f.endsWith('.svg'))) {
  copyFileSync(join(IMAGES_FROM, f), join(IMAGES_TO, f))
  copied++
}

const yaml = (/** @type {string} */ s) => `"${s.replace(/"/g, '\\"')}"`

for (const page of PAGES) {
  let md = readFileSync(join(ROOT, page.from), 'utf8')
  // Starlight renders the title from frontmatter, so the H1 would be a second one.
  md = md.replace(/^#\s+.*\n+/, '')
  md = md.replace(/src="images\/([^"]+)"/g, `src="${BASE}diagrams/$1"`)
  md = md.replace(/srcset="images\/([^"]+)"/g, `srcset="${BASE}diagrams/$1"`)
  // Everything else relative points at the repository, not at another page here.
  md = md.replace(/\]\((?!https?:|#|\/)([^)]+)\)/g, (_, href) => {
    const target = href.startsWith('../') ? href.slice(3) : `docs/${href}`
    return `](${BLOB}/${target})`
  })

  const front = ['---', `title: ${yaml(page.title)}`, `description: ${yaml(page.description)}`, '---', '']
  const out = join(ROOT, page.to)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, front.join('\n') + md)
}

const left = [...readFileSync(join(ROOT, PAGES[0].to), 'utf8').matchAll(/src(?:set)?="(images\/[^"]+)"/g)]
if (left.length) {
  console.error(`import-docs: ${left.length} image paths were not rewritten`)
  process.exit(1)
}
console.error(`IMPORT-DOCS ok pages=${PAGES.length} images=${copied} base=${BASE}`)
