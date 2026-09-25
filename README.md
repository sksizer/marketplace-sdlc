# marketplace-sdlc

A marketplace of SDLC agent extensions — skills, commands, subagents, prompts,
rules, and MCP server configuration — packaged for multiple coding-agent
harnesses rather than a single vendor.

The same capability (say, a task-planning workflow) is expressed once as a
concept and distributed in whatever form each harness expects: a plugin for one,
a rules file for another, a prompt directory for a third.

## Target harnesses

| Harness | Distribution form |
| --- | --- |
| Claude Code | Plugin marketplace (`.claude-plugin/marketplace.json`, `plugins/`) |
| Codex | `AGENTS.md`, prompt files, MCP config |
| Cursor | Project rules, commands, MCP config |
| Others (Windsurf, Cline, Aider, Gemini CLI, …) | Rules / prompts / MCP config as each supports |

The list is expected to grow. Nothing here is Claude-specific by design — a
harness is added by teaching the repo how to emit that harness's format.

## Status

Early, and the set of skills is still growing. What is fixed:

- Extensions are versioned in git and consumed directly from this repo.
- Each harness gets a form it can load natively — no manual copy-paste.
- Skills are authored once as markdown notes under `src/` and rendered per
  harness, rather than maintained as parallel copies.

A skill's peer files — a script, a schema — are copied into every pack
verbatim. There is no build step between the vault and an install, so a peer
file has to run as written and carry no dependencies.

## Installing

### Claude Code

```bash
/plugin marketplace add sksizer/marketplace-sdlc
/plugin install <plugin>@sdlc
```

Use a local path instead of the GitHub slug to track a working tree:

```bash
/plugin marketplace add /path/to/marketplace-sdlc
```

### Other harnesses

Per-harness install instructions land here as each one is wired up.

## Documentation site

`site/` is an Astro Starlight site with a page for each plugin and skill,
built from the committed `.claude-plugin/` tree and the plugin notes under
`src/`. `.github/workflows/pages.yml` deploys it to GitHub Pages from `main`.
To preview it locally:

```bash
cd site
bun install
bun run dev
```

## Prose documentation

Longer pages live in [`docs/`](docs), which is the source of truth for them.
They read correctly on GitHub with relative links, and the site copies them in
at build time through `scripts/import-docs.mjs`. Edit `docs/`, never the
generated copy under `site/src/content/docs/`.

- [Structural diagrams](docs/diagrams.md) — the diagrams `explore-codebase`
  draws, and the payload that produces each one.

## Contributing

Run `agent-pants build` after changing anything under `src/`, and commit the
regenerated packs with it — a skill whose prose names a peer file its pack
omits is broken for everyone who installs it. Use a current `agent-pants`: an
older binary silently reverts newer frontmatter it does not understand.

The checks need no dependencies beyond Node:

```bash
node scripts/check-diagrams.mjs            # renderer and schema agree; labels stay in their boxes
node scripts/build-doc-images.mjs --check  # the diagram images in docs/ are not stale
```

Open a pull request against `main`. A pull request stacked on another branch
merges into a dead end once that base lands, and this repository has lost work
that way; `.github/workflows/pr-base.yml` now refuses it.

## License

MIT. See [LICENSE](LICENSE).

## Stacked pull requests

A pull request based on another branch merges into a dead end once that base is
merged: GitHub reports it as merged and the work never reaches `main`. This
repository lost a skill that way twice.

`.github/workflows/pr-base.yml` refuses such a pull request, and retargets any
open one to `main` whenever a push to `main` makes its base inert. Where Actions
are unavailable, run the same check by hand:

```bash
./scripts/check-pr-bases.sh
```

Prefer basing on `main`. Where stacking is worth it, retarget to `main` before
merging.
