#!/usr/bin/env bash
# check-diff.sh --base-ref REF [--head-ref REF]
# Blocks a PR that would be empty: either no commits ahead of base, or commits that
# cancel each other out (e.g. add + revert) so the net diff against the merge-base is empty.
#
# Exit 0: real changes exist (prints AHEAD_COUNT, MERGE_BASE, FILES_CHANGED)
# Exit 3: no commits ahead of base, or no common history
# Exit 4: commits ahead but effective diff is empty
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BASE_REF="" HEAD_REF="HEAD"
while [ $# -gt 0 ]; do
  case $1 in
    --base-ref) BASE_REF=${2-}; shift ;;
    --head-ref) HEAD_REF=${2-}; shift ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done
need_arg base-ref "$BASE_REF"

git rev-parse --verify -q "$BASE_REF^{commit}" >/dev/null || DIE_CODE=2 die "unknown base ref: $BASE_REF"
git rev-parse --verify -q "$HEAD_REF^{commit}" >/dev/null || DIE_CODE=2 die "unknown head ref: $HEAD_REF"

ahead=$(git rev-list --count "$BASE_REF..$HEAD_REF")
if [ "$ahead" -eq 0 ]; then
  DIE_CODE=3 die "$HEAD_REF has no commits ahead of $BASE_REF; nothing to open a PR for."
fi

mb=$(git merge-base "$BASE_REF" "$HEAD_REF" 2>/dev/null || true)
[ -n "$mb" ] || DIE_CODE=3 die "no common history between $BASE_REF and $HEAD_REF."

rc=0
git diff --quiet "$mb" "$HEAD_REF" -- || rc=$?
case $rc in
  0) DIE_CODE=4 die "$ahead commit(s) ahead of $BASE_REF but the net diff is empty (changes were reverted). Not opening a PR." ;;
  1) ;;
  *) DIE_CODE=2 die "git diff failed (exit $rc)." ;;
esac

emit AHEAD_COUNT "$ahead"
emit MERGE_BASE "$mb"
emit FILES_CHANGED "$(git diff --name-only "$mb" "$HEAD_REF" -- | wc -l | tr -d ' ')"
