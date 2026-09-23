#!/usr/bin/env bash
# Report every open pull request whose base has already been merged. Such a
# pull request merges into a dead end: GitHub reports it as merged and the
# work never reaches the default branch. This repository lost two skills that
# way, in #6 and again in #16.
#
# Two signals, because either alone misses cases:
#
#   1. The base branch's tip is already contained in the default branch.
#   2. A merged pull request exists whose HEAD was this base branch.
#
# Signal 1 alone is not enough: once the stacked pull request merges into the
# base, the base carries commits the default branch lacks, so the containment
# test goes false precisely when the damage is done. Signal 2 survives that.
#
# The workflow in .github/workflows/pr-base.yml does this automatically. Run
# this by hand where Actions are unavailable.
set -euo pipefail

default=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
git fetch origin --quiet

orphans=0
while read -r number base; do
  [ -z "${number:-}" ] && continue

  reason=""
  git fetch origin "$base" --quiet 2>/dev/null || true
  if git rev-parse --verify --quiet "origin/$base" >/dev/null &&
     git merge-base --is-ancestor "origin/$base" "origin/$default"; then
    reason="its tip is already contained in $default"
  elif [ "$(gh pr list --state merged --head "$base" --json number --jq 'length')" -gt 0 ]; then
    merged_as=$(gh pr list --state merged --head "$base" --json number --jq '.[0].number')
    reason="it was merged as PR #$merged_as"
  fi

  if [ -n "$reason" ]; then
    echo "ORPHANED  PR #$number  base '$base' is dead: $reason"
    echo "          fix: gh pr edit $number --base $default"
    orphans=$((orphans + 1))
  fi
done < <(gh pr list --state open --json number,baseRefName \
           --jq '.[] | select(.baseRefName != "'"$default"'") | "\(.number) \(.baseRefName)"')

if [ "$orphans" -eq 0 ]; then
  echo "No open pull request is stacked on a merged base."
else
  echo
  echo "$orphans pull request(s) would merge into a dead end."
  exit 1
fi
