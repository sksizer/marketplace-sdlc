import { dirname, join, relative } from 'node:path'
import type { Root, RootContent } from 'mdast'
import type { VFile } from 'vfile'
import { repoRoot, sourceUrl } from './marketplace'

const external = /^([a-z][a-z0-9+.-]*:|\/|#|<)/i

function visitLinks(node: Root | RootContent, fn: (url: string) => string): void {
  if (node.type === 'link' || node.type === 'definition') node.url = fn(node.url)
  if ('children' in node) for (const child of node.children) visitLinks(child, fn)
}

/**
 * Fits a SKILL.md body to the site: drops the leading `# heading`, which the
 * page already shows as its title, and points links to files bundled beside
 * the skill at their source on GitHub.
 */
export function remarkSkill() {
  return (tree: Root, file: VFile) => {
    const path = file.path ?? ''
    if (!path.endsWith('/SKILL.md')) return

    const first = tree.children.find((node) => node.type !== 'html')
    if (first?.type === 'heading' && first.depth === 1) {
      tree.children.splice(tree.children.indexOf(first), 1)
    }

    visitLinks(tree, (url) =>
      external.test(url) ? url : `${sourceUrl}/${relative(repoRoot, join(dirname(path), url))}`,
    )
  }
}
