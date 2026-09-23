// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { unified } from '@astrojs/markdown-remark'
import { loadMarketplace, repoUrl } from './src/lib/marketplace.ts'
import { remarkSkill } from './src/lib/remark-skill.ts'

const marketplace = loadMarketplace()

// GitHub Pages serves a project site under /<repo>/. The Pages workflow sets
// SITE_BASE; a local build serves from the root.
const base = process.env.SITE_BASE ?? '/'

export default defineConfig({
  site: 'https://sksizer.github.io',
  base,
  markdown: { processor: unified({ remarkPlugins: [remarkSkill] }) },
  integrations: [
    starlight({
      title: `${marketplace.name} marketplace`,
      description: marketplace.description,
      social: [{ icon: 'github', label: 'GitHub', href: repoUrl }],
      sidebar: [
        { label: 'Overview', link: '/' },
        ...marketplace.plugins.map((plugin) => ({
          label: plugin.name,
          items: [
            { label: 'About', link: `/${plugin.name}/` },
            ...plugin.skills.map((skill) => ({
              label: skill.name,
              link: `/${plugin.name}/${skill.name}/`,
            })),
          ],
        })),
      ],
    }),
  ],
})
