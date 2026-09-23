# site

The documentation site for this marketplace: one page for the marketplace,
one per plugin and one per skill.

At build time it reads the committed Claude Code tree at the repo root
(`.claude-plugin/marketplace.json`, each plugin's `plugin.json`, each skill's
`SKILL.md`) and each plugin's note under `src/marketplaces/`. Nothing is
generated into the source tree. After `agent-pants build`, the next site build
picks up the changes.

```bash
bun install
bun run dev        # local preview
bun run build      # static site in dist/
bun run typecheck
```

The Pages workflow sets `SITE_BASE` to `/<repo>/` because GitHub Pages serves a
project site under the repository name. A local build serves from `/`.
