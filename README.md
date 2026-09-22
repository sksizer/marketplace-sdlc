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
/plugin install <plugin>@marketplace-sdlc
```

Use a local path instead of the GitHub slug to track a working tree:

```bash
/plugin marketplace add /path/to/marketplace-sdlc
```

### Other harnesses

Per-harness install instructions land here as each one is wired up.

## Contributing

Scripts (Node and/or Python) are expected for building and validating the
per-harness outputs. Until the layout settles, open an issue or a PR describing
the capability you want to add and which harnesses it should target.

## License

MIT. See [LICENSE](LICENSE).
