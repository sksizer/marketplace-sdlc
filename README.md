# marketplace-sdlc

A [Claude Code](https://claude.com/claude-code) plugin marketplace hosting the
`sdlc` plugin and related agent tooling.

A marketplace is a git repository that publishes a catalog of plugins. Users add
the marketplace once, then install any plugin it lists.

## Install

```bash
# inside Claude Code
/plugin marketplace add sksizer/marketplace-sdlc
/plugin install sdlc@marketplace-sdlc
```

To track a local checkout instead of GitHub:

```bash
/plugin marketplace add /path/to/marketplace-sdlc
```

Update the catalog at any time with `/plugin marketplace update marketplace-sdlc`.

## Layout

```
.claude-plugin/
  marketplace.json    # the catalog: name, owner, plugin entries
plugins/
  <plugin-name>/
    .claude-plugin/
      plugin.json     # plugin manifest (name, version, description)
    commands/         # slash commands
    skills/           # skills
    agents/           # subagent definitions
    hooks/            # hook configuration
```

Plugins may live in this repo under `plugins/`, or be referenced from another
repository via a `git` / `git-subdir` source in `marketplace.json`.

## Adding a plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json` with at least a `name`,
   `version`, and `description`.
2. Add the skills, commands, agents, or hooks the plugin ships.
3. Append an entry to the `plugins` array in
   `.claude-plugin/marketplace.json`:

   ```json
   {
     "name": "<name>",
     "description": "What it does.",
     "source": "./plugins/<name>"
   }
   ```

4. Commit and push. Consumers pick it up on the next marketplace update.

## Local development

Point Claude Code at your working tree so edits take effect without a push:

```bash
/plugin marketplace add .
/plugin install <name>@marketplace-sdlc
```

Use `/plugin` to inspect what is installed and from which marketplace.
