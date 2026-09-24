# marketplace-sdlc

A marketplace of SDLC agent extensions — skills, commands, subagents, prompts,
rules, and MCP server configuration — packaged for multiple coding-agent
harnesses rather than a single vendor.

Browse the plugins and skills at
**[sksizer.github.io/marketplace-sdlc](https://sksizer.github.io/marketplace-sdlc/)**.

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

Early. The directory layout is not settled yet, so this README deliberately
does not document one. What is fixed:

- Extensions are versioned in git and consumed directly from this repo.
- Each harness gets a form it can load natively — no manual copy-paste.
- Where a capability is shared across harnesses, the intent is one source of
  truth rather than parallel hand-maintained copies.

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

The [documentation site](https://sksizer.github.io/marketplace-sdlc/) has a
page for each plugin and skill. It is an Astro Starlight site in `site/`,
built from the committed `.claude-plugin/` tree and the plugin notes under
`src/`. `.github/workflows/pages.yml` deploys it to GitHub Pages from `main`.
To preview it locally:

```bash
cd site
bun install
bun run dev
```

## Contributing

Scripts (Node and/or Python) are expected for building and validating the
per-harness outputs. Until the layout settles, open an issue or a PR describing
the capability you want to add and which harnesses it should target.

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
