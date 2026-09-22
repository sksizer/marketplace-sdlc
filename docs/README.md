# Documentation

- **[Skills](skills.md)** — every published skill, what it does, and when to
  reach for it.
- **[Structural diagrams](diagrams.md)** — the diagrams `explore-codebase`
  draws, with worked examples.

## How the repository is arranged

Extensions are authored once, as markdown notes in a vault, and rendered into
whatever form each harness loads natively. Nothing is hand-maintained per
harness.

```text
src/marketplaces/<marketplace>/
  <marketplace>.md                       the marketplace note
  plugins/<plugin>/
    <plugin>.md                          the plugin note
    skills/<skill>/
      <skill>.md                         the skill itself
      <anything else>                    peer files, copied verbatim
```

A note's frontmatter says what it is. `ap-kind` is `plugin` or `skill`,
`ap-plugin` names the plugin a skill belongs to, and `ap-version` is the
version a consumer installs. `name` and `description` are what the harness
shows. Everything else — the body — is the instruction the agent loads.

Anything sitting beside a skill file is copied into the pack unchanged. That is
how `explore-codebase` ships a renderer and a JSON schema next to its prose:
there is no build step between the vault and an install, so a peer file has to
run as written. `render_map.mjs` has no dependencies for that reason.

[`agent-pants.yaml`](../agent-pants.yaml) configures the render.
`agent-pants build` writes the per-harness trees at the repository root, so the
bare repo URL is the marketplace location for every harness at once.

## Checks

No build is required to use this repository, and the checks are plain Node with
no dependencies.

```bash
node scripts/check-diagrams.mjs            # renderer and schema agree; labels stay in their boxes
node scripts/build-doc-images.mjs --check  # the images in docs/ are not stale
```

Run `node scripts/build-doc-images.mjs` after changing the renderer or an
example, and commit what it writes.

## Writing a skill

1. Add `src/marketplaces/sdlc/plugins/<plugin>/skills/<skill>/<skill>.md` with
   `name`, `description`, `ap-kind: skill` and `ap-plugin` in its frontmatter.
   A new plugin also needs its own note beside `skills/`.
2. Write the `description` for the agent deciding whether to load the skill. It
   is the only part always in context, so it should say both what the skill
   does and the situations that call for it.
3. Keep peer files dependency-free, and give the skill a way to prove its
   output is correct rather than asserting that it is.
4. Add the skill to [skills.md](skills.md).
