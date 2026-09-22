The rules a comment is judged by: where a fact belongs, what earns an inline
comment, how a kept comment reads, and when a comment is a duplicate of
something with a better home. `/comment-review` applies them as verdicts; a
code-review pass applies them to the comments in a diff.

### The expression ladder

A fact about code has exactly one right home. Work down this list and stop at the
first rung that can carry it:

1. **The name.** A name that states the fact needs no comment stating it. This
   rung is not just the local identifier — it runs all the way up, and the
   higher the level, the more readers a good name serves:
   - **Variables and constants.** `// retry three times` above `const n = 3` is
     `const MAX_RETRIES = 3`.
   - **Functions and methods.** A verb phrase naming the effect and the result.
     A comment that summarises the body is a rename waiting to happen.
   - **Types, fields, and enum members.** `Status.PendingReview` needs no
     comment saying what the state means; `status: string` plus a comment
     listing the values does.
   - **Classes.** The noun says what the thing *is* and what it owns. A class
     that needs a comment to say what belongs in it is usually two classes.
   - **Files and modules.** The filename is the first thing a reader greps and
     the last thing they read. A module named for its contents needs no header
     comment announcing them.
   - **Packages and directories.** The boundary's name states what is inside
     and, by omission, what is not. A small `utils` holding genuinely
     miscellaneous helpers is fine — not every function earns a category. What
     the name has to keep out is the `utils` that grew a subsystem: once a
     reader needs a comment to learn what lives there, the directory is a
     second home for something that deserves its own name.
2. **The signature and the types.** Parameter names, a union instead of a string,
   a non-null return instead of a documented "never null", an options object
   instead of three positional booleans. A comment describing what a type already
   guarantees is a duplicate of the type.
3. **The declaration's doc annotation.** One block on the declaration, for the
   contract a *caller* needs and cannot read off the signature: what the function
   promises, what it throws, what it mutates, what invariant it assumes on entry.
   Facts a caller needs go here, not scattered inline where a caller never looks.
   Use the language's own annotation form rather than a loose block above the
   declaration — TSDoc `/** */` with `@param`, `@returns`, `@throws`; rustdoc
   `///` with `# Errors` and `# Panics`; the docstring in Python. The native form
   is what tooling, hovers, and generated docs read, so a fact written there
   reaches the caller where a bare `//` above the line does not. A per-parameter
   fact belongs in that parameter's tag, not in an inline comment beside the
   argument.
4. **An inline comment.** Everything left over — and only what is left over.

A name cannot carry an explanation, only a label. When a package or module
needs one — how its pieces fit, the protocol its callers follow — that is
shared documentation, and the code points at it rather than restating it. See
*Duplication becomes a reference* below for the reference form, and *A concept
explained in code may belong in documentation* for when a block has outgrown
the file it sits in.

### What earns an inline comment

Only a fact a competent reader cannot deduce from the code in front of them:

- **The why**, where the obvious alternative was tried and does not work. Name the
  alternative and what broke.
- **An empirical fact about the outside world** — an API's undocumented behavior, a
  browser or runtime bug, a measured cost. Facts nothing in the file can imply.
- **A non-local constraint** — an ordering another file depends on, an invariant
  held elsewhere, a call this code must not make.
- **A deliberate deviation** from a convention the reader will otherwise read as a
  mistake.
- **A pointer to an external cause** — an issue, a spec section, a recorded decision.

Everything else is noise. In particular these never earn one: restating the
statement below it; naming a block (`// loop over the items`); describing a
parameter the signature already names and types; change history; decorative
banners and section rules; a summary of a well-named function's body; a count or
other project measurement that nothing keeps true.

### How a kept comment reads

A comment that earns its place still has to be worth reading. A comment that
is kept or rewritten obeys five rules:

- **Short.** One or two sentences. A comment that needs a paragraph is usually a
  fact with a home further down the ladder, or one that belongs in documentation.
- **Plain and literal.** State the fact directly. No metaphor, no analogy, no
  jokes — a reader who does not share the reference has to decode the sentence
  before they can use it, and a metaphor that drifts from the code cannot be
  detected as wrong.
- **Descriptive, not evaluative.** "Runs before the index is built" is a fact.
  "Careful here!" and "this is tricky" are not; they warn without saying what of.
- **One idea per comment.** Two unrelated facts stacked in one block are two
  comments, each next to the code it is about.
- **Bullets over long prose.** Where a block legitimately carries several points
  — a doc annotation with conditions, a module header — write them as a list. A
  reader scans a list; they have to parse a paragraph to find the one line they
  came for. Prose stays where the narrative is the point: reasoning that builds,
  where each step depends on the one before and the conclusion does not stand
  without them. Split that into bullets and the argument becomes a set of
  assertions the reader has to reassemble. A list is for facts that are true
  independently; a paragraph is for a case that has to be made.

### A comment does not pin volatile project state

A count, a version, a date, a list of the files that do something, the name of
whoever owns a thing — each is true when written and drifts the moment the project
moves, with nothing to notice. The comment is not merely stale afterwards; it is
wrong, and it is wrong in a way a reader has no reason to suspect.

Apply one test: **does the exact value change what the reader does?** Usually it
does not, and the sentence is better without it.

```text
# All 67 of these libraries are members of the ROOT bun workspace, so prettier,
# oxlint and tsc come from the root node_modules.
```

The load is carried by *all of them are workspace members*. The 67 adds nothing a
reader acts on and is wrong on the next library added. Drop the number and keep
the sentence. Same for `15 of the 67 declare a build script` — `some declare a
build script; the rest are source-shipped` says what the reader needs, and stays
true.

When the exact value genuinely is load-bearing — a pinned version another tool
must match, a threshold a measurement has to stay under — it is not volatile
state, it is a constraint. Keep it, and say what breaks when it changes. When a
reader would want the current number, point at the command that computes it rather
than writing the answer down.

### Duplication becomes a reference

The same explanation written in two places drifts: one site is updated and the
other goes stale silently, with nothing to detect it. When one fact is explained
in more than one place, pick a single canonical home and make every other site a
pointer to it.

- **Choosing the home.** For a fact about one function, its doc annotation. For a
  fact about a mechanism several call sites share, the declaration of that
  mechanism. For a project convention, the convention doc or standard that owns
  it — never a source file.
- **The reference form.** Code: a relative path and a symbol, as in
  `see writeJsonAtomic in lib/util/fs.ts`. Documentation: a relative path to the
  doc, as in `see docs/conventions/logging.md`. Both are greppable, and both break
  loudly when the target moves.
- **Not everything repeated is duplication.** Two comments about the same subject
  that each carry a distinct local fact are two comments. Collapse only when one
  is genuinely a copy of the other's content.

Data is the sharpest case. A comment that lists the valid statuses, restates a
config default, or spells out a table's columns is a second copy of that data and
will disagree with the first one within a release. Point at the canonical
definition — the enum, the schema, the config file — and let the reader read the
values there.

#### A concept explained in code may belong in documentation

When a comment block explains a whole mechanism — the design of a subsystem, a
protocol between components, the reasoning behind an architecture — it has
outgrown the source file. Before keeping it, search the project's
documentation for the concept — its `docs/` tree, its conventions, and wherever
it records standards and decisions.

- **The concept is already documented.** Replace the block with a relative path
  to the doc, keeping only the one line the reader of
  *this* file needs. Read the target first and confirm it says what you are about
  to stop saying here.
- **The concept is not documented and deserves to be.** Flag the gap, naming
  the concept, the file, and the doc that should own it. Leave the
  comment in place until the doc exists — the fact has nowhere else to live
  yet.
- **The concept is local to this one declaration.** It stays, tightened to the
  rules above. Not every explanation is a document.
