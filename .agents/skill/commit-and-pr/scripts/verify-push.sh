#!/usr/bin/env bash
# verify-push.sh --remote REMOTE --branch BRANCH [--ref REF]
# Compares the LOCAL commit (REF, default HEAD) with the LIVE tip of the branch on the remote,
# asked directly with `git ls-remote` (not the possibly stale remote-tracking ref).
#
# Exit 0: identical (prints PUSHED_OID)
# Exit 5: branch missing on remote, or tips differ
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

REMOTE="" BRANCH="" REF="HEAD"
while [ $# -gt 0 ]; do
  case $1 in
    --remote) REMOTE=${2-}; shift ;;
    --branch) BRANCH=${2-}; shift ;;
    --ref) REF=${2-}; shift ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done
need_arg remote "$REMOTE"
need_arg branch "$BRANCH"

local_oid=$(git rev-parse --verify -q "$REF^{commit}") || DIE_CODE=2 die "unknown ref: $REF"

listing=$(git ls-remote --refs "$REMOTE" "refs/heads/$BRANCH") ||
  DIE_CODE=2 die "git ls-remote failed for remote '$REMOTE'."
remote_oid=$(printf '%s\n' "$listing" | awk -v r="refs/heads/$BRANCH" '$2 == r { print $1 }')

if [ -z "$remote_oid" ]; then
  DIE_CODE=5 die "branch '$BRANCH' does not exist on remote '$REMOTE'. Push it first."
fi
if [ "$local_oid" != "$remote_oid" ]; then
  DIE_CODE=5 die "out of sync: local ${local_oid:0:12} vs remote ${remote_oid:0:12} on '$REMOTE/$BRANCH'. Push (or reconcile) before continuing."
fi

emit PUSHED_OID "$remote_oid"
