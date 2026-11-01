#!/usr/bin/env bash
# create-pr.sh --head-remote R --head-branch BR --head-repo OWNER/NAME --head-spec SPEC
#              --base-remote R --base-repo OWNER/REPO --base-branch B
#              --title TEXT --body-file FILE [--draft]
#
# Opens a PR with every guard enforced in one place (they cannot be skipped by the caller):
#   1. the local commit equals the live remote tip          (verify-push.sh)
#   2. the branch has a non-empty net diff against base      (check-diff.sh)
#   3. no open PR already exists for this exact head/base     (select-pr.sh --state open)
#   4. `gh pr create` always receives --repo, so the target never depends on cwd or remote names
#
# Exit 0 + PR_URL (PR_CREATED=1 or PR_EXISTS=1). Other exits come from the guards (5, 4, 3, 11, 2).
set -euo pipefail
DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
. "$DIR/lib.sh"

HEAD_REMOTE="" HEAD_BRANCH="" HEAD_REPO="" HEAD_SPEC="" BASE_REMOTE="" BASE_REPO="" BASE_BRANCH=""
TITLE="" BODY_FILE="" DRAFT=0
while [ $# -gt 0 ]; do
  case $1 in
    --head-remote) HEAD_REMOTE=${2-}; shift ;;
    --head-branch) HEAD_BRANCH=${2-}; shift ;;
    --head-repo) HEAD_REPO=${2-}; shift ;;
    --head-spec) HEAD_SPEC=${2-}; shift ;;
    --base-remote) BASE_REMOTE=${2-}; shift ;;
    --base-repo) BASE_REPO=${2-}; shift ;;
    --base-branch) BASE_BRANCH=${2-}; shift ;;
    --title) TITLE=${2-}; shift ;;
    --body-file) BODY_FILE=${2-}; shift ;;
    --draft) DRAFT=1 ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done
for a in head-remote head-branch head-repo head-spec base-remote base-repo base-branch title body-file; do
  v=${a//-/_}; v=$(printf '%s' "$v" | tr '[:lower:]' '[:upper:]')
  need_arg "$a" "${!v}"
done
[ -f "$BODY_FILE" ] || DIE_CODE=2 die "body file not found: $BODY_FILE"

# 1. pushed and in sync (live ls-remote, not the local tracking ref)
bash "$DIR/verify-push.sh" --remote "$HEAD_REMOTE" --branch "$HEAD_BRANCH" >/dev/null

# 2. effective diff against a fresh base
git fetch -q "$BASE_REMOTE" || DIE_CODE=2 die "git fetch $BASE_REMOTE failed."
bash "$DIR/check-diff.sh" --base-ref "$BASE_REMOTE/$BASE_BRANCH" --head-ref "$HEAD_BRANCH" >/dev/null

# 3. existing open PR for the same head and base
rc=0
existing=$(bash "$DIR/select-pr.sh" --base-repo "$BASE_REPO" --head-branch "$HEAD_BRANCH" \
  --head-repo "$HEAD_REPO" --base-branch "$BASE_BRANCH" --state open) || rc=$?
case $rc in
  0)
    eval "$existing"
    info "An open PR already exists: #$PR_NUMBER $PR_URL (the push already updated it). Not creating another."
    emit PR_EXISTS 1
    emit PR_NUMBER "$PR_NUMBER"
    emit PR_URL "$PR_URL"
    exit 0
    ;;
  10) ;;
  *) exit "$rc" ;;
esac

# 4. create, pinned to the base repository
args=(pr create --repo "$BASE_REPO" --base "$BASE_BRANCH" --head "$HEAD_SPEC" --title "$TITLE" --body-file "$BODY_FILE")
[ "$DRAFT" = 1 ] && args+=(--draft)
url=$(gh "${args[@]}") || DIE_CODE=2 die "gh pr create failed."

emit PR_CREATED 1
emit PR_URL "$(printf '%s\n' "$url" | tail -n 1)"
