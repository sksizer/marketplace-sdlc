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

## Documentation

- [Skills](docs/skills.md) — every published skill and when to reach for it.
- [Structural diagrams](docs/diagrams.md) — the diagrams `explore-codebase` draws.
- [Repository layout and how to add a skill](docs/README.md).

## Status

Early, and the set of skills is still growing. What is fixed:

- Extensions are versioned in git and consumed directly from this repo.
- Each harness gets a form it can load natively — no manual copy-paste.
- Extensions are authored once as markdown notes under `src/` and rendered per
  harness, rather than maintained as parallel copies.

## Installing

### Claude Code

```bash
/plugin marketplace add sksizer/marketplace-sdlc
/plugin install <plugin>@marketplace-sdlc
```

Use a local path instead of the GitHub slug to track a working tree:

```bash
/plugin marketplace add /path/to/marketplace-sdlc
```

### Other harnesses

Per-harness install instructions land here as each one is wired up.

## Contributing

[docs/README.md](docs/README.md) covers the vault layout, the checks, and the
steps for adding a skill. For a capability that needs a harness this repo does
not emit yet, open an issue describing it and which harnesses it should target.
