import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { marketplaceRoot, vaultRoot } from './lib/marketplace'

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  // The plugin notes in the vault, keyed by plugin name. Their bodies are
  // prose the build does not ship, so the plugin pages read them from here.
  plugins: defineCollection({
    loader: glob({
      base: vaultRoot,
      pattern: '*/plugins/*/*.md',
      generateId: ({ entry }) => entry.split('/')[2]!,
    }),
    schema: z.looseObject({ name: z.string() }),
  }),
  // One entry per SKILL.md, keyed `<plugin>/<skill>`.
  skills: defineCollection({
    loader: glob({
      base: `${marketplaceRoot}/.claude-plugin/packs`,
      pattern: '*/skills/*/SKILL.md',
      generateId: ({ entry }) => entry.replace('/skills/', '/').replace(/\/SKILL\.md$/, ''),
    }),
    schema: z.looseObject({
      name: z.string(),
      description: z.string(),
      'allowed-tools': z.string().optional(),
      'argument-hint': z.string().optional(),
      metadata: z.object({ trigger: z.string().optional() }).loose().optional(),
    }),
  }),
}
