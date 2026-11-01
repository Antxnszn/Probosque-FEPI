#!/usr/bin/env bash
# select-pr.sh --base-repo OWNER/REPO --head-branch BRANCH --head-repo OWNER/NAME
#              [--base-branch B] [--state open|merged|closed|all] [--head-oid OID] [--list]
#
# Finds THE pull request for a branch, without relying on the unsupported "owner:branch"
# syntax of `gh pr list --head`:
#   1. list PRs of the base repository whose head branch NAME matches (--state all, --limit 100)
#   2. filter the JSON by head repository owner/name, base branch, state and head commit
#   3. require exactly ONE candidate, then read its metadata in a single `gh pr view <number>`
#
# Exit 0  exactly one PR: prints PR_NUMBER PR_URL PR_STATE PR_BASE_REF PR_HEAD_REF PR_HEAD_OID
#         PR_HEAD_OWNER PR_HEAD_REPO PR_MERGE_OID
# Exit 10 no matching PR
# Exit 11 several matching PRs (never picks one arbitrarily; candidates are listed on stderr)
# Exit 2  usage error, gh failure, or the PR changed between the two reads
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BASE_REPO="" HEAD_BRANCH="" HEAD_REPO="" BASE_BRANCH="" STATE=all HEAD_OID="" LIST_ONLY=0
while [ $# -gt 0 ]; do
  case $1 in
    --base-repo) BASE_REPO=${2-}; shift ;;
    --head-branch) HEAD_BRANCH=${2-}; shift ;;
    --head-repo) HEAD_REPO=${2-}; shift ;;
    --base-branch) BASE_BRANCH=${2-}; shift ;;
    --state) STATE=${2-}; shift ;;
    --head-oid) HEAD_OID=${2-}; shift ;;
    --list) LIST_ONLY=1 ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done
need_arg base-repo "$BASE_REPO"
need_arg head-branch "$HEAD_BRANCH"
need_arg head-repo "$HEAD_REPO"
case $STATE in open | merged | closed | all) ;; *) DIE_CODE=2 die "--state must be open|merged|closed|all" ;; esac
[[ $HEAD_REPO =~ ^[^/]+/[^/]+$ ]] || DIE_CODE=2 die "--head-repo must look like OWNER/NAME."

# Filter parameters travel through the environment so they are never interpolated into jq code.
export F_BRANCH=$HEAD_BRANCH F_OWNER=${HEAD_REPO%%/*} F_REPO=${HEAD_REPO#*/}
export F_STATE=$STATE F_BASE=$BASE_BRANCH F_OID=$HEAD_OID

US=$'\x1f' # unit separator: cannot appear in refs or URLs and, unlike tab, keeps empty fields

JQ_ALL='(length | tostring),
  (.[]
  | select(.headRefName == $ENV.F_BRANCH)
  | select(((.headRepositoryOwner.login // "") | ascii_downcase) == ($ENV.F_OWNER | ascii_downcase))
  | select(((.headRepository.name // "") | ascii_downcase) == ($ENV.F_REPO | ascii_downcase))
  | select(($ENV.F_STATE == "all") or (.state == ($ENV.F_STATE | ascii_upcase)))
  | select(($ENV.F_BASE == "") or (.baseRefName == $ENV.F_BASE))
  | select(($ENV.F_OID == "") or (.headRefOid == $ENV.F_OID))
  | [(.number | tostring), .state, .baseRefName, .headRefOid, .url] | join("\u001f"))'

# NOTE: no "owner:branch" here. gh filters --head by branch name only.
# One call: first output line is the number of PRs returned, the rest are the filtered candidates.
raw=$(gh pr list --repo "$BASE_REPO" --head "$HEAD_BRANCH" --state all --limit 100 \
  --json number,url,state,baseRefName,headRefName,headRefOid,headRepository,headRepositoryOwner \
  --jq "$JQ_ALL") || DIE_CODE=2 die "gh pr list failed for $BASE_REPO."

total=$(printf '%s\n' "$raw" | head -n 1)
candidates=$(printf '%s\n' "$raw" | tail -n +2)
[ "$total" -lt 100 ] || DIE_CODE=2 die "100+ PRs use branch name '$HEAD_BRANCH' in $BASE_REPO; result may be truncated. Resolve manually."

count=0
[ -z "$candidates" ] || count=$(printf '%s\n' "$candidates" | wc -l | tr -d ' ')

print_candidates() {
  printf '%s\n' "$candidates" | while IFS=$US read -r n st base oid url; do
    printf '  #%s %s base=%s head=%s %s\n' "$n" "$st" "$base" "${oid:0:12}" "$url" >&2
  done
}

if [ "$LIST_ONLY" = 1 ]; then
  if [ "$count" -eq 0 ]; then info "  (no PRs match)"; else print_candidates; fi
  exit 0
fi

if [ "$count" -eq 0 ]; then
  DIE_CODE=10 die "no PR matches branch '$HEAD_BRANCH' from $HEAD_REPO in $BASE_REPO (state=$STATE${HEAD_OID:+, head=${HEAD_OID:0:12}})."
fi
if [ "$count" -gt 1 ]; then
  info "ERROR: $count PRs match branch '$HEAD_BRANCH' from $HEAD_REPO in $BASE_REPO; refusing to pick one:"
  print_candidates
  exit 11
fi

IFS=$US read -r number list_state _ list_oid _ <<<"$candidates"

JQ_VIEW='[(.number | tostring), .state, .baseRefName, .headRefName, .headRefOid,
  (.headRepositoryOwner.login // ""), (.headRepository.name // ""), (.mergeCommit.oid // ""), .url] | join("\u001f")'
meta=$(gh pr view "$number" --repo "$BASE_REPO" \
  --json number,url,state,baseRefName,headRefName,headRefOid,headRepository,headRepositoryOwner,mergeCommit \
  --jq "$JQ_VIEW") || DIE_CODE=2 die "gh pr view #$number failed for $BASE_REPO."

IFS=$US read -r v_number v_state v_base v_head v_oid v_owner v_repo v_merge v_url <<<"$meta"

# The single metadata read is the source of truth; refuse if identity drifted since the list.
[ "$v_number" = "$number" ] && [ "$v_head" = "$HEAD_BRANCH" ] &&
  [ "$(lc "$v_owner")" = "$(lc "${HEAD_REPO%%/*}")" ] && [ "$(lc "$v_repo")" = "$(lc "${HEAD_REPO#*/}")" ] ||
  DIE_CODE=2 die "PR #$number metadata does not match the expected head ($HEAD_REPO:$HEAD_BRANCH)."
[ -z "$HEAD_OID" ] || [ "$v_oid" = "$HEAD_OID" ] ||
  DIE_CODE=2 die "PR #$number head moved (${v_oid:0:12}) since it was listed; retry."
[ "$v_oid" = "$list_oid" ] || DIE_CODE=2 die "PR #$number changed between reads; retry."

emit PR_NUMBER "$v_number"
emit PR_URL "$v_url"
emit PR_STATE "$v_state"
emit PR_BASE_REF "$v_base"
emit PR_HEAD_REF "$v_head"
emit PR_HEAD_OID "$v_oid"
emit PR_HEAD_OWNER "$v_owner"
emit PR_HEAD_REPO "$v_repo"
emit PR_MERGE_OID "$v_merge"
