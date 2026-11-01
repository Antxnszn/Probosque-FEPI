#!/usr/bin/env bash
# resolve-repos.sh [--branch BRANCH] [--head-remote REMOTE] [--base-repo OWNER/REPO] [--base-branch BRANCH]
#
# Resolves, explicitly and verifiably, where the branch lives (HEAD_*) and where the PR must go (BASE_*).
# Nothing is inferred from a remote's *name*: the base repository comes from GitHub (fork parent) or
# from --base-repo, and the local remote is found by matching its URL against that repository.
#
# Prints eval-safe KEY=VALUE lines:
#   CURRENT_BRANCH HEAD_REMOTE HEAD_REPO HEAD_OWNER BASE_REPO BASE_REPO_SOURCE
#   BASE_REMOTE BASE_BRANCH BASE_REF IS_CROSS_REPO HEAD_SPEC ON_BASE_BRANCH
#
# Exit 3: no local remote points at the base repository (stop; ask the user).
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BRANCH="" HEAD_REMOTE="" BASE_REPO_OVERRIDE="" BASE_BRANCH_OVERRIDE=""
while [ $# -gt 0 ]; do
  case $1 in
    --branch) BRANCH=${2-}; shift ;;
    --head-remote) HEAD_REMOTE=${2-}; shift ;;
    --base-repo) BASE_REPO_OVERRIDE=${2-}; shift ;;
    --base-branch) BASE_BRANCH_OVERRIDE=${2-}; shift ;;
    *) DIE_CODE=2 die "unknown argument: $1" ;;
  esac
  shift
done

command -v gh >/dev/null 2>&1 || die "GitHub CLI (gh) is required to resolve repositories."

if [ -z "$BRANCH" ]; then
  BRANCH=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
  [ -n "$BRANCH" ] || die "detached HEAD and no --branch given."
fi

# ------------------------------------------------------------- head remote
if [ -z "$HEAD_REMOTE" ]; then
  for cand in \
    "$(git config --get "branch.$BRANCH.pushRemote" 2>/dev/null || true)" \
    "$(git config --get remote.pushDefault 2>/dev/null || true)" \
    "$(git config --get "branch.$BRANCH.remote" 2>/dev/null || true)"; do
    if [ -n "$cand" ] && remote_exists "$cand"; then HEAD_REMOTE=$cand; break; fi
  done
fi
if [ -z "$HEAD_REMOTE" ]; then
  if remote_exists origin; then
    HEAD_REMOTE=origin
  elif [ "$(git remote | wc -l | tr -d ' ')" = 1 ]; then
    HEAD_REMOTE=$(git remote)
  else
    die "cannot tell which remote receives '$BRANCH'. Pass --head-remote."
  fi
fi
remote_exists "$HEAD_REMOTE" || die "remote '$HEAD_REMOTE' does not exist."

head_slug=$(remote_slug "$HEAD_REMOTE")
[ -n "$head_slug" ] || die "cannot parse OWNER/REPO from the URL of remote '$HEAD_REMOTE'."

# Canonical names, fork status and parent come from GitHub, in one call.
SEP='|'
JQ_REPO='[.nameWithOwner, (.isFork | tostring), (if .parent then (.parent.owner.login + "/" + .parent.name) else "" end), (.defaultBranchRef.name // "")] | join("|")'
repo_info() { gh repo view "$1" --json nameWithOwner,isFork,parent,defaultBranchRef --jq "$JQ_REPO"; }

head_info=$(repo_info "$head_slug") || die "gh could not read repository '$head_slug' (no access, or it does not exist)."
IFS=$SEP read -r HEAD_REPO head_is_fork head_parent head_default <<<"$head_info"
HEAD_OWNER=${HEAD_REPO%%/*}

# --------------------------------------------------------------- base repo
if [ -n "$BASE_REPO_OVERRIDE" ]; then
  [[ $BASE_REPO_OVERRIDE =~ ^[^/]+/[^/]+$ ]] || DIE_CODE=2 die "--base-repo must look like OWNER/REPO."
  base_info=$(repo_info "$BASE_REPO_OVERRIDE") || die "gh could not read base repository '$BASE_REPO_OVERRIDE'."
  IFS=$SEP read -r BASE_REPO _ _ base_default <<<"$base_info"
  BASE_REPO_SOURCE=override
elif [ "$head_is_fork" = true ] && [ -n "$head_parent" ]; then
  base_info=$(repo_info "$head_parent") || die "gh could not read the fork parent '$head_parent'."
  IFS=$SEP read -r BASE_REPO _ _ base_default <<<"$base_info"
  BASE_REPO_SOURCE=fork-parent
else
  BASE_REPO=$HEAD_REPO
  base_default=$head_default
  BASE_REPO_SOURCE=same-repo
fi

BASE_BRANCH=${BASE_BRANCH_OVERRIDE:-$base_default}
[ -n "$BASE_BRANCH" ] || die "cannot determine the base branch of $BASE_REPO. Pass --base-branch."

# ------------------------------------------------- local remote for the base
matches=()
while IFS= read -r r; do
  [ -n "$r" ] || continue
  slug=$(remote_slug "$r")
  if [ -n "$slug" ] && [ "$(lc "$slug")" = "$(lc "$BASE_REPO")" ]; then matches+=("$r"); fi
done < <(git remote)

if [ "${#matches[@]}" -eq 0 ]; then
  DIE_CODE=3 die "no local remote points at the base repository $BASE_REPO. Stop and ask the user (do not guess a remote by name)."
fi
BASE_REMOTE=${matches[0]}
if [ "${#matches[@]}" -gt 1 ]; then
  for r in "${matches[@]}"; do [ "$r" = upstream ] && BASE_REMOTE=upstream; done
  warn "several remotes point at $BASE_REPO (${matches[*]}); using '$BASE_REMOTE'."
fi

git ls-remote --exit-code --heads "$BASE_REMOTE" "refs/heads/$BASE_BRANCH" >/dev/null 2>&1 ||
  die "branch '$BASE_BRANCH' not found on remote '$BASE_REMOTE' ($BASE_REPO)."

# ------------------------------------------------------------------ output
IS_CROSS_REPO=0
[ "$(lc "$HEAD_REPO")" = "$(lc "$BASE_REPO")" ] || IS_CROSS_REPO=1
HEAD_SPEC=$BRANCH
[ "$IS_CROSS_REPO" = 1 ] && HEAD_SPEC="$HEAD_OWNER:$BRANCH"
ON_BASE_BRANCH=0
[ "$BRANCH" = "$BASE_BRANCH" ] && ON_BASE_BRANCH=1

emit CURRENT_BRANCH "$BRANCH"
emit HEAD_REMOTE "$HEAD_REMOTE"
emit HEAD_REPO "$HEAD_REPO"
emit HEAD_OWNER "$HEAD_OWNER"
emit BASE_REPO "$BASE_REPO"
emit BASE_REPO_SOURCE "$BASE_REPO_SOURCE"
emit BASE_REMOTE "$BASE_REMOTE"
emit BASE_BRANCH "$BASE_BRANCH"
emit BASE_REF "$BASE_REMOTE/$BASE_BRANCH"
emit IS_CROSS_REPO "$IS_CROSS_REPO"
emit HEAD_SPEC "$HEAD_SPEC"
emit ON_BASE_BRANCH "$ON_BASE_BRANCH"
