#!/usr/bin/env bash
# post-merge-cleanup.sh --branch BR --base-repo OWNER/REPO --base-remote R --base-branch B --head-repo OWNER/NAME
#
# Fail-Safe Post-Merge Cleanup. NOT transactional: the steps run in order and stop at the first
# failed check. Nothing is deleted unless every check passed, so a failure can leave the repo
# switched to the base branch (and possibly fast-forwarded) but never with a branch lost.
#
# Order: clean tree -> fetch -> decide deletion mode -> switch to base -> ff-only -> delete.
#
# Deletion modes
#   -d  the branch tip is already an ancestor of the fetched base (merge commit / fast-forward).
#       Git itself proves nothing is lost; no GitHub lookup is needed.
#   -D  squash or rebase merge (history was rewritten). Allowed ONLY when ALL hold:
#         - exactly one PR matches the branch, the head repository owner/name AND the exact local tip
#         - that PR is MERGED, into the expected base branch
#         - PR head commit == local tip (no unpushed/extra local commits)
#         - the merge commit GitHub recorded exists locally and is an ancestor of <base-remote>/<base>
#
# Exit 0 done (CLEANUP_MODE=d|D|none). Exit 6 blocked by a safety check (nothing deleted). Exit 1/2 other errors.
set -euo pipefail
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
. "$DIR/lib.sh"

BRANCH="" BASE_REPO="" BASE_REMOTE="" BASE_BRANCH="" HEAD_REPO=""
while [ $# -gt 0 ]; do
  case $1 in
    --branch) BRANCH=${2-}; shift ;;
    --base-repo) BASE_REPO=${2-}; shift ;;
    --base-remote) BASE_REMOTE=${2-}; shift ;;
    --base-branch) BASE_BRANCH=${2-}; shift ;;
    --head-repo) HEAD_REPO=${2-}; shift ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done
for a in branch base-repo base-remote base-branch head-repo; do
  v=$(printf '%s' "${a//-/_}" | tr '[:lower:]' '[:upper:]'); need_arg "$a" "${!v}"
done

blocked() { DIE_CODE=6 die "BLOCKED (nothing deleted): $*"; }

[ "$BRANCH" != "$BASE_BRANCH" ] || blocked "refusing to clean up the base branch '$BASE_BRANCH'."
remote_exists "$BASE_REMOTE" || DIE_CODE=2 die "remote '$BASE_REMOTE' does not exist."

# 1. a dirty tree must never be carried across a checkout
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  die "working tree has uncommitted changes to tracked files. Commit or stash them first."
fi

# 2. fresh view of the base repository
git fetch --prune -q "$BASE_REMOTE" || DIE_CODE=2 die "git fetch $BASE_REMOTE failed."
BASE_REF="refs/remotes/$BASE_REMOTE/$BASE_BRANCH"
git rev-parse --verify -q "$BASE_REF^{commit}" >/dev/null ||
  die "$BASE_REMOTE/$BASE_BRANCH not found after fetch."

sync_base() {
  local cur
  cur=$(git symbolic-ref -q --short HEAD || true)
  if [ "$cur" != "$BASE_BRANCH" ]; then
    if git show-ref --verify -q "refs/heads/$BASE_BRANCH"; then
      git checkout -q "$BASE_BRANCH"
    else
      # creates branch.<base>.remote/merge tracking metadata: expected and approved here
      git checkout -q -b "$BASE_BRANCH" --track "$BASE_REMOTE/$BASE_BRANCH"
    fi
  fi
  git merge --ff-only -q "$BASE_REMOTE/$BASE_BRANCH" ||
    die "cannot fast-forward local '$BASE_BRANCH' to $BASE_REMOTE/$BASE_BRANCH (local commits or divergence). Nothing was deleted."
}

LOCAL_OID=$(git rev-parse --verify -q "refs/heads/$BRANCH^{commit}" || true)
if [ -z "$LOCAL_OID" ]; then
  info "Local branch '$BRANCH' does not exist; only syncing '$BASE_BRANCH'."
  sync_base
  emit CLEANUP_MODE none
  exit 0
fi

# 3. decide how (and whether) the branch may be deleted
if git merge-base --is-ancestor "$LOCAL_OID" "$BASE_REF"; then
  MODE=d
else
  rc=0
  sel=$(bash "$DIR/select-pr.sh" --base-repo "$BASE_REPO" --head-branch "$BRANCH" --head-repo "$HEAD_REPO" \
    --state all --head-oid "$LOCAL_OID") || rc=$?
  case $rc in
    0) eval "$sel" ;;
    10)
      info "No PR has head commit ${LOCAL_OID:0:12}. PRs known for this branch name:"
      bash "$DIR/select-pr.sh" --base-repo "$BASE_REPO" --head-branch "$BRANCH" --head-repo "$HEAD_REPO" --list || true
      blocked "local '$BRANCH' is at ${LOCAL_OID:0:12}, which no merged PR contains (unpushed or extra local commits, or never merged)."
      ;;
    11) blocked "more than one PR matches this exact commit; resolve manually." ;;
    *) exit "$rc" ;;
  esac
  [ "$PR_STATE" = MERGED ] || blocked "PR #$PR_NUMBER is $PR_STATE, not MERGED."
  [ "$PR_BASE_REF" = "$BASE_BRANCH" ] || blocked "PR #$PR_NUMBER was merged into '$PR_BASE_REF', not '$BASE_BRANCH'."
  [ "$PR_HEAD_OID" = "$LOCAL_OID" ] || blocked "PR head ${PR_HEAD_OID:0:12} differs from local tip ${LOCAL_OID:0:12}."
  [ -n "$PR_MERGE_OID" ] || blocked "GitHub recorded no merge commit for PR #$PR_NUMBER."
  git cat-file -e "$PR_MERGE_OID^{commit}" 2>/dev/null ||
    blocked "merge commit ${PR_MERGE_OID:0:12} of PR #$PR_NUMBER is not present locally after fetch."
  git merge-base --is-ancestor "$PR_MERGE_OID" "$BASE_REF" ||
    blocked "merge commit ${PR_MERGE_OID:0:12} is not in the history of $BASE_REMOTE/$BASE_BRANCH (base history rewritten?)."
  MODE=D
fi

# 4. act: leave the branch, bring the base up to date
sync_base

# 5. delete, only if the branch still points at what was verified
NOW_OID=$(git rev-parse --verify -q "refs/heads/$BRANCH^{commit}" || true)
[ "$NOW_OID" = "$LOCAL_OID" ] || blocked "branch '$BRANCH' moved during cleanup; not deleting."

if [ "$MODE" = d ]; then
  git branch -d -q "$BRANCH"
else
  git branch -D -q "$BRANCH"
fi

info "Deleted local branch '$BRANCH' (git branch -$MODE) at ${LOCAL_OID:0:12}. Recover with: git branch $BRANCH $LOCAL_OID"
emit CLEANUP_MODE "$MODE"
emit DELETED_BRANCH "$BRANCH"
emit DELETED_AT_OID "$LOCAL_OID"
