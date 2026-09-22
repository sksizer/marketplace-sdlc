---
name: comment-review
description: 'Review the comments in a diff or a subtree and minimize them against the expression ladder: a fact belongs first in the identifier, then in the signature and types, then in the declaration''s doc annotation, and only when none of those can carry it does it earn an inline comment. Deletes comments that restate the code, moves facts down the ladder, tightens what survives to one short literal statement, strips volatile project state, and replaces duplicated prose with a reference to one canonical home. Invoke for "review the comments", "too many comments", "comment cleanup", or as the comment pass on a branch before review.'
argument-hint: '[diff | <path>… | <PR#>] [--report-only] [--workflow]'
allowed-tools:
- Bash
- Read
- Edit
- Glob
- Grep
- Agent
- AskUserQuestion
- Workflow
trigger: /comment-review
ap-kind: skill
ap-plugin: review
---

# comment-review — minimize the comments in a body of code

Minimize the comments in a body of code by pushing every fact as far down the
expression ladder as it will go, and by replacing duplication with a reference.

Usage:

- `/comment-review` — review the current branch's diff against `main`, plus
  any uncommitted changes.
- `/comment-review diff` — review only what is uncommitted: the working tree
  and the index against `HEAD`, plus untracked files. For a pass before you commit.
- `/comment-review src/lib` — review every comment in that subtree,
  committed or not.
- `/comment-review 1742` — review the diff of that PR.
- `/comment-review --report-only` — report the verdicts and stop. No edits.
- `/comment-review --workflow` — run the judging, duplication, and defence
  passes as one Workflow script instead of hand-dispatched agents. Without the
  flag, step 2 judges whether a workflow would help and asks before starting one.

## The rules

Every judgement applies the rules below. They live in
[[comment-rubric]] beside this skill, so a code-review pass can apply the
same rules to the comments in a diff; the judging agents and
the workflow script read that file.

![[comment-rubric]]

Restructuring is in scope. When a comment exists because the code is shaped
badly, the fix is to reshape the code, provided the change is behavior-preserving
and stays inside the reviewed scope.

## 1. Resolve the scope and build the inventory

Determine the review scope from the argument:

- No argument — `git diff <default-branch>...HEAD` plus `git diff HEAD` for
  uncommitted work. Scope is the changed lines and the declarations that contain
  them. Resolve the default branch rather than assuming `main`:
  `git symbolic-ref --short refs/remotes/origin/HEAD`, falling back to `main`.
- `diff` — uncommitted work only: `git diff HEAD` for tracked changes, staged and
  unstaged, plus `git ls-files --others --exclude-standard` for new files, which
  are in scope whole. Nothing already committed is reviewed.
- A path — every source file under it. Scope is the whole file.
- A number — `gh pr diff <n>`. Scope is the diff. Run against a checkout of the
  PR's head (`gh pr checkout <n>`) when applying edits, since steps 5 and 6 need
  the files on disk; `--report-only` can read the diff alone.

Then build the comment inventory over that scope with `Grep`, recording for each
comment its `path`, `line`, verbatim text, and the declaration that encloses it.
Exclude generated files, vendored trees, and fixtures. Report the count as
`N comments across M files` and continue; if the count is zero, print
`COMMENT-REVIEW-CLEAN` and stop.

## 2. Judge each comment — fan out one agent per file

### Choose the dispatch mode

Steps 2, 3, and 4 all fan out agents. They run either as hand-dispatched `Agent`
calls or as one `Workflow` script chaining the three passes. Decide once, here,
before dispatching anything:

- **`--workflow` was given.** Use the Workflow tool. The flag is the user's
  opt-in; do not ask again.
- **No flag.** Judge whether a workflow would help. It helps when hand dispatch
  would exceed the parallel-agent cap or push every per-file verdict through this
  session's context: as a rule, more than 8 files, more than 40 comments, or any
  subtree scope. When it would help, ask once with `AskUserQuestion`, stating the
  file and comment counts and the number of agents each mode runs, with "run as a
  Workflow" and "dispatch agents directly" as the options. When it would not
  help, dispatch with `Agent` and do not ask.

The Workflow tool gates on explicit consent; the flag or the answer is that
consent. Under Workflow, the checked-in script carries all three passes — judge
per file, then the duplication pass over every verdict, then a defender per
deletion — and returns the merged verdicts. The script is
[[review.workflow.js]]. Pass it by path, not inline:

```text
Workflow({
  scriptPath: "<absolute path of review.workflow.js, beside this skill file>",
  args: {
    rulesPath: "<absolute path of references/comment-rubric.md, beside this skill file>",
    files: [{ path, comments: [{ line, text, declaration }] }, …],
    docsRoots: ["docs/"],
    scope: "<one line naming what is under review>"
  }
})
```

It returns `{ files: [{ path, verdicts }], docGaps, homes, counts }`, each verdict
already merged through steps 3 and 4. Take it to step 5. Batch the inventory by
comment count so one invocation stays inside the session's workflow agent
guideline, and run the batches in sequence.

### The verdicts

Give each judging agent the file and the rules. Each returns one structured
verdict per comment:

| Verdict | Means |
|---|---|
| `promote-to-name` | The fact belongs in an identifier. Names the rename. |
| `promote-to-signature` | The fact belongs in a type or parameter. Names the change. |
| `promote-to-annotation` | Caller-facing; move it to the declaration's doc block. |
| `dedupe-to-reference` | Restates a fact with a canonical home. Names the home. |
| `promote-to-doc` | Explains a whole mechanism. Names the doc that should own it, and whether it already exists. |
| `tighten` | Earns its place, but only part of it does. Gives the shorter text. |
| `delete` | Restates the code, or is stale, or is wrong. |
| `keep` | Carries a non-deducible fact, stated once, at the right length. |

Every non-`keep` verdict carries the concrete replacement — the new name, the new
type, the target declaration, the reference target, or the rewritten text. A
verdict with no replacement is not actionable; the agent returns `keep` instead.

`tighten` is the verdict for a comment that carries a real fact but breaks one
of the four reading rules or pins a volatile value; it carries the shorter text,
with the value removed. `delete` only when the value *was* the whole comment. A
comment that explains a concept with no doc to point at stays in place and is
reported as a documentation gap.

Agents also flag any comment that is **factually wrong about the code beneath it**
as `delete` or `tighten` with the correction, regardless of whether the diff
touched it. A stale comment is worse than no comment, so fix it on sight.

## 3. Cross-file duplication pass

One agent reads the full inventory at once and reports groups of comments that
explain the same fact in different places. For each group it names the canonical
home and the reference each other site should carry. This pass needs every comment
together, so it runs after step 2 completes rather than per-file.

Merge its groups into the step-2 verdicts: a comment in a group gets
`dedupe-to-reference` unless step 2 already marked it `delete`.

The same agent resolves every `promote-to-doc` verdict, because only it can see
whether two files explain the same mechanism. For each, it searches the project's
documentation roots for the concept and returns either the existing
target — which turns the verdict into `dedupe-to-reference` against that target —
or a documentation gap, which becomes a reported finding and leaves the comment
in place.

## 4. Verify the deletions — the expensive error is losing a fact

Deleting a comment that carried a hard-won fact costs more than leaving a redundant
one, and the loss is invisible afterwards. So every `delete` and every
`dedupe-to-reference` gets one independent agent whose job is to **defend the
comment**: it reads the code without the comment and argues that the fact is not
deducible, or that the named canonical home does not actually contain it.

When the defender succeeds, downgrade the verdict to `tighten` or `keep`. When
uncertain, keep. `promote-*` and `tighten` verdicts skip this pass — they move a
fact rather than dropping it.

## 5. Apply

Work file by file, applying surviving verdicts with `Edit`. Three constraints:

- **A rename must be complete.** Apply `promote-to-name` only when every reference
  to the identifier is inside the reviewed scope; otherwise downgrade to `tighten`
  and note it. A half-applied rename is a broken build.
- **Behavior does not change.** `promote-to-signature` is a type-level or
  argument-shape change only. If the fix needs a semantic change, drop it and
  report it as a finding instead.
- **Skip rather than argue.** A verdict you judge to be a false positive is noted
  as skipped, with one line of why.

Under `--report-only`, stop here and report the verdicts without editing.

## 6. Verify the result

Run, and do not proceed past a failure:

```text
git diff --stat
```

Confirm the diff touches only comments, doc blocks, identifiers, and types — no
control flow, no literals other than renamed constants. Then run the affected
packages' own type checks and tests, whatever the project's task runner calls
them.

A green suite after a comment pass is the whole gate: a rename that missed a call
site or a signature change that broke a caller shows up here and nowhere else.

## 7. Report

Print a terminal marker and then the summary:

```text
COMMENT-REVIEW-DONE removed=<n> promoted=<n> referenced=<n> tightened=<n> kept=<n> doc-gaps=<n>
```

Follow it with the count per verdict, the renames applied, the canonical homes the
duplication pass chose, and every verdict skipped with its reason. Then the net
line count the comments lost. End with the documentation gaps: each concept that
outgrew its source file with no doc to point at, its location, and the doc that
should own it.

Use `COMMENT-REVIEW-CLEAN` instead when no comment needed changing, and
`ERROR reason="..."` when the scope could not be resolved or the checks stayed red.

## Failure modes

- **The ladder used as license to delete.** The goal is fewer comments carrying
  more, not fewer comments. A pass that deletes half the comments and promotes
  nothing did not do the work.
- **Renaming past the scope boundary.** The most tempting rename is usually the one
  with call sites across the repo. Step 5's first constraint exists for it.
- **Rewriting a comment you did not understand.** A comment whose fact you cannot
  place is a `keep`, not a `delete`. Not understanding it is evidence it carries
  something.
- **Reference to a home that does not say it.** Before writing `see X`, read X and
  confirm the fact is actually there. If it is not, put it there first.
- **A workflow started on the assessment alone.** Step 2's assessment decides
  whether to ask, never whether to run. Without `--workflow` or a yes, the
  passes run as `Agent` calls.

## Notes

- Read-and-edit only on comments, names, types, and doc blocks. This skill never
  changes behavior; a simplification pass restructures code and a bug-finding
  pass fixes defects.
- Terminal markers are namespaced `COMMENT-REVIEW-` so a caller can grep for
  them.
- The skill does not commit. Landing the change is the caller's step, so a comment
  pass can ride on the branch that motivated it.
