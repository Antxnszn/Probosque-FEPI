#!/usr/bin/env bash
# preflight.sh [--need-gh]
# Verifies the current directory is a normal Git work tree in a state where committing is safe.
# Prints REPO_ROOT and CURRENT_BRANCH as eval-safe KEY=VALUE lines.
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

NEED_GH=0
while [ $# -gt 0 ]; do
  case $1 in
    --need-gh) NEED_GH=1 ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done

inside=$(git rev-parse --is-inside-work-tree 2>/dev/null || true)
[ "$inside" = "true" ] ||
  die "not inside a Git work tree (bare repository, .git directory, or not a repository). Aborting."

[ "$(git rev-parse --is-bare-repository)" = "false" ] ||
  die "this is a bare repository; there is no work tree to commit from."

branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
[ -n "$branch" ] || die "detached HEAD: check out or create a branch first."

for marker in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD rebase-merge rebase-apply BISECT_LOG; do
  if [ -e "$(git rev-parse --git-path "$marker")" ]; then
    die "a Git operation is in progress ($marker). Finish or abort it first."
  fi
done

if [ "$NEED_GH" = 1 ]; then
  command -v gh >/dev/null 2>&1 || die "GitHub CLI (gh) is not installed."
  gh auth status >/dev/null 2>&1 || die "GitHub CLI is not authenticated (run: gh auth login)."
fi

emit REPO_ROOT "$(git rev-parse --show-toplevel)"
emit CURRENT_BRANCH "$branch"
