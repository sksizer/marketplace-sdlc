// Reads the committed Claude Code marketplace at the repo root so the site
// documents exactly what users install. `agent-pants build` writes it from the
// vault under `src/`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export const repoSlug = 'sksizer/marketplace-sdlc'
export const repoUrl = `https://github.com/${repoSlug}`

/** Base URL for linking to a file on main by its repo-relative path. */
export const sourceUrl = `${repoUrl}/blob/main`

/**
 * The repo root, which is also the marketplace root: plugin `source` paths
 * resolve against it. Resolved from the working directory because Astro
 * bundles this module before prerendering, which moves `import.meta.url`.
 * Astro runs from `site/`, one level below the repo root.
 */
export const repoRoot = resolve(process.cwd(), '..')
export const marketplaceRoot = repoRoot

/** The agent-pants vault that `agent-pants.yaml` builds the marketplace from. */
export const vaultRoot = resolve(repoRoot, 'src/marketplaces')

export interface Skill {
  name: string
  plugin: string
  /** Files shipped beside SKILL.md, relative to the skill directory. */
  files: string[]
}

export interface Plugin {
  name: string
  description: string
  version: string
  license?: string
  skills: Skill[]
}

export interface Marketplace {
  name: string
  description: string
  owner: string
  plugins: Plugin[]
}

interface MarketplaceJson {
  name: string
  description: string
  owner: { name: string }
  plugins: { name: string; source: string; description: string; version: string }[]
}

interface PluginJson {
  license?: string
  skills?: string
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((entry) => {
      const path = join(dir, entry)
      return statSync(path).isDirectory() ? listFiles(path, root) : [relative(root, path)]
    })
}

export function loadMarketplace(): Marketplace {
  const json = readJson<MarketplaceJson>(
    join(marketplaceRoot, '.claude-plugin', 'marketplace.json'),
  )
  const plugins = json.plugins.map((entry): Plugin => {
    const pluginDir = join(marketplaceRoot, entry.source)
    const manifest = readJson<PluginJson>(join(pluginDir, '.claude-plugin', 'plugin.json'))
    const skillsDir = join(pluginDir, manifest.skills ?? 'skills')
    const skills = readdirSync(skillsDir)
      .filter((name) => statSync(join(skillsDir, name)).isDirectory())
      .sort()
      .map((name) => ({
        name,
        plugin: entry.name,
        files: listFiles(join(skillsDir, name)).filter((file) => file !== 'SKILL.md'),
      }))
    return {
      name: entry.name,
      description: entry.description,
      version: entry.version,
      license: manifest.license,
      skills,
    }
  })
  return { name: json.name, description: json.description, owner: json.owner.name, plugins }
}
