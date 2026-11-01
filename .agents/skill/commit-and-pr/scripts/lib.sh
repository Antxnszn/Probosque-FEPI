#!/usr/bin/env bash
# Shared helpers for the commit-and-pr scripts. Source this file; do not execute it.
#
# Exit-code convention used across the scripts:
#   0   success
#   1   generic failure / precondition not met
#   2   usage error or unexpected tool (gh/git) failure
#   3   no matching remote, or no commits ahead of base
#   4   commits exist but the net diff against base is empty
#   5   local branch and remote branch are out of sync
#   6   post-merge cleanup blocked (nothing was deleted)
#   10  no matching pull request
#   11  more than one matching pull request (ambiguous)

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit "${DIE_CODE:-1}"
}

warn() { printf 'WARN: %s\n' "$*" >&2; }
info() { printf '%s\n' "$*" >&2; }

# emit KEY VALUE -> prints KEY=<shell-quoted VALUE>, safe to pass through eval.
emit() { printf '%s=%q\n' "$1" "${2-}"; }

# lc STRING -> lowercase
lc() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# need_arg NAME VALUE -> usage error when VALUE is empty
need_arg() {
  [ -n "${2-}" ] || { DIE_CODE=2 die "missing required argument --$1"; }
}

# url_to_slug URL -> prints OWNER/REPO, or nothing when the URL is not of that shape.
# Handles https://host/o/r(.git), ssh://git@host[:port]/o/r(.git), git@host:o/r(.git).
url_to_slug() {
  local url=${1-} path
  url=${url%/}
  url=${url%.git}
  case $url in
    *://*)
      path=${url#*://}   # drop scheme
      path=${path#*/}    # drop user@host[:port]
      ;;
    *:*)
      path=${url#*:}     # scp-like: user@host:owner/repo
      ;;
    *)
      return 0
      ;;
  esac
  if [[ $path =~ ^[^/]+/[^/]+$ ]]; then
    printf '%s' "$path"
  fi
}

# remote_slug REMOTE -> OWNER/REPO from the *raw* configured URL (not insteadOf-expanded).
remote_slug() {
  local raw
  raw=$(git config --get "remote.$1.url" 2>/dev/null || true)
  url_to_slug "$raw"
}

# remote_exists REMOTE
remote_exists() {
  git remote | grep -Fxq -- "$1"
}

# Directory that holds the scripts (resolved even when called through a symlink-free path).
scripts_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}
