# Skills

Every skill published by this marketplace, what it is for, and how to reach it.

A skill's own file is the instruction the agent loads. This page is for a
person deciding whether to install one, so it says what a skill does and when
it earns its context — not how it does it. Follow the source link for that.

| Plugin | Skill | Reach it with |
| --- | --- | --- |
| `authoring` | `collaborate-in-markdown` | Point at a markdown file you are editing |
| `codebase` | `explore-codebase` | Ask how a codebase works, or `--html` for a diagrammed page |
| `demo` | `hello-world` | Verify an install |
| `review` | `comment-review` | `/comment-review` |
| `review` | `sks-code-review` | `/sks-code-review` |

## `authoring`

Skills for writing and maintaining documents alongside the people who own them.

### `collaborate-in-markdown`

Co-edit a markdown document while the user is typing in it.

The problem it solves is a write that clobbers something the user just wrote.
The skill treats their draft as authoritative and in motion: it reads the file
immediately before acting, does the work that `@agent` markers in the document
ask for, and presents every proposed change in chat for approval before writing
anything.

Reach for it when the user points at a markdown file containing `@agent`
markers, asks you to fill in part of a document you are both working on, or
says to work through a document together.

[Source](../src/marketplaces/sdlc/plugins/authoring/skills/collaborate-in-markdown/collaborate-in-markdown.md)

## `codebase`

Skills for understanding and improving an unfamiliar body of code.

### `explore-codebase`

Build an accurate mental model of a codebase, spending the least context to get
there.

It covers getting oriented in a new repo, locating where something is
implemented, and tracing how a request flows end to end. The method is
verification-first: it reads the code that answers the question rather than
inferring from names and directory structure.

Reach for it when you are dropped into an unfamiliar repo, before editing code
you have not read, or on questions like "how does X work here" and "where is Y
handled".

**Arguments:** `[--html]`

It can save what it found as a markdown file, a linked Obsidian-style vault, or
— with `--html` — a self-contained page carrying diagrams of the structure.
Those diagrams have their own page: [Structural diagrams](diagrams.md).

[Source](../src/marketplaces/sdlc/plugins/codebase/skills/explore-codebase/explore-codebase.md)

## `review`

Skills for judging a change or a body of code before it merges.

### `comment-review`

Review the comments in a diff or a subtree and minimize them.

It applies one rule, the expression ladder: a fact belongs first in the
identifier, then in the signature and types, then in the declaration's doc
annotation, and only when none of those can carry it does it earn an inline
comment. In practice it deletes comments that restate the code, moves facts
down the ladder, tightens what survives to one short literal statement, strips
volatile project state, and replaces duplicated prose with a reference to one
canonical home.

The ladder itself lives in a
[rubric](../src/marketplaces/sdlc/plugins/review/skills/comment-review/references/comment-rubric.md)
that other review skills embed, so they judge comments the same way.

Reach for it on "review the comments", "too many comments", or as the comment
pass on a branch before review.

**Arguments:** `[diff | <path>… | <PR#>] [--report-only] [--workflow]`

`--report-only` reports without editing. `--workflow` runs the review as a
multi-agent workflow rather than in line.

[Source](../src/marketplaces/sdlc/plugins/review/skills/comment-review/comment-review.md)

### `sks-code-review`

Get a second opinion on the current branch from a different model.

It shells out to a headless external agent — `codex` by default, `claude` on
request — and asks for a review of the branch against the upstream default
branch: potential errors, cleanup areas, duplication, and opportunities to
better use or grow the library set.

The value is that the reviewer did not write the code and does not share the
author's context.

Reach for it before opening a pull request, or when you want a check that is
not your own reasoning again.

[Source](../src/marketplaces/sdlc/plugins/review/skills/sks-code-review/sks-code-review.md)

## `demo`

A demonstration plugin: one skill, to prove the marketplace builds and
installs.

### `hello-world`

Prints a greeting and reports the marketplace it was installed from. Use it to
confirm an install worked before debugging anything more complicated.

[Source](../src/marketplaces/sdlc/plugins/demo/skills/hello-world/hello-world.md)
