#!/usr/bin/env bash
# check-secrets.sh
# Scans EVERYTHING currently staged (git diff --cached), regardless of who staged it:
#   - file names of all staged files
#   - the content of every added line
# Never prints matched content; only rule name and location.
#
# Exit 0: nothing high-confidence found (REVIEW lines may still be printed).
# Exit 1: at least one HIGH-confidence finding -> do not commit.
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

[ "$(git rev-parse --is-inside-work-tree 2>/dev/null || true)" = "true" ] ||
  die "not inside a Git work tree."

high=0
review=0
report() { # LEVEL RULE LOCATION
  printf '%s %s %s\n' "$1" "$2" "$3"
  if [ "$1" = HIGH ]; then high=$((high + 1)); else review=$((review + 1)); fi
}

# ---------------------------------------------------------------- file names
while IFS= read -r -d '' path; do
  name=$(lc "${path##*/}")
  case $name in
    .env.example | .env.sample | .env.template | .env.dist | *.example | *.sample | *.template) continue ;;
  esac
  case $name in
    .env | .env.* | .netrc | .pgpass | .htpasswd | credentials | credentials.json | \
      *.p12 | *.pfx | *.jks | *.keystore | *.tfstate | *.tfstate.backup | \
      id_rsa | id_dsa | id_ecdsa | id_ed25519)
      report HIGH "sensitive-file-name" "$path"
      ;;
    *.pem | *.key | *.tfvars | *secret* | *credential* | .npmrc | .pypirc | service-account*.json)
      report REVIEW "suspicious-file-name" "$path"
      ;;
  esac
done < <(git diff --cached --name-only -z --diff-filter=ACMRT)

# ------------------------------------------------------------- added content
tmp=$(mktemp "${TMPDIR:-/tmp}/secretscan.XXXXXX")
trap 'rm -f "$tmp"' EXIT

# Emit "path<TAB>line<TAB>content" for every added line of the staged diff.
git -c core.quotepath=off diff --cached --no-color --no-ext-diff -U0 --diff-filter=ACMRT |
  awk '
    /^diff --git / { inhdr = 1; next }
    inhdr && /^\+\+\+ / { f = $0; sub(/^\+\+\+ (b\/)?/, "", f); next }
    /^@@ / { inhdr = 0; if (match($0, /\+[0-9]+/)) ln = substr($0, RSTART + 1, RLENGTH - 1) + 0; next }
    inhdr { next }
    /^\+/ { printf "%s\t%d\t%s\n", f, ln, substr($0, 2); ln++ }
  ' >"$tmp"

R_NAME=() R_LEVEL=() R_ICASE=() R_PAT=()
rule() { R_NAME+=("$1"); R_LEVEL+=("$2"); R_ICASE+=("$3"); R_PAT+=("$4"); }

rule private-key        HIGH   0 '-----BEGIN ([A-Z0-9]+ )*PRIVATE KEY( BLOCK)?-----'
rule aws-access-key-id  HIGH   0 '(^|[^A-Za-z0-9])(AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[0-9A-Z]{16}([^A-Za-z0-9]|$)'
rule github-token       HIGH   0 '(^|[^A-Za-z0-9_])(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})'
rule slack-token        HIGH   0 '(^|[^A-Za-z0-9])xox[abprs]-[A-Za-z0-9-]{10,}'
rule google-api-key     HIGH   0 '(^|[^A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}'
rule stripe-live-key    HIGH   0 '(^|[^A-Za-z0-9])[rs]k_live_[0-9A-Za-z]{16,}'
rule anthropic-api-key  HIGH   0 'sk-ant-[A-Za-z0-9_-]{20,}'
rule openai-api-key     HIGH   0 '(^|[^A-Za-z0-9])sk-(proj-)?[A-Za-z0-9_-]{32,}'
rule url-credentials    HIGH   0 '[A-Za-z][A-Za-z0-9+.-]*://[^/[:space:]:@]+:[^/[:space:]:@$<{%]{3,}@[^/[:space:]]+'
rule jwt                REVIEW 0 '(^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
rule hardcoded-secret   REVIEW 1 "(password|passwd|pwd|secret|api[_-]?key|access[_-]?key|auth[_-]?token|access[_-]?token|client[_-]?secret|private[_-]?key)[A-Za-z0-9_]*[[:space:]]*[:=][[:space:]]*['\"][^'\" ]{8,}['\"]"

for i in "${!R_NAME[@]}"; do
  flags=(-E -a)
  [ "${R_ICASE[$i]}" = 1 ] && flags+=(-i)
  while IFS=$'\t' read -r file line; do
    [ -n "$file" ] || continue
    report "${R_LEVEL[$i]}" "${R_NAME[$i]}" "$file:$line"
  done < <(LC_ALL=C grep "${flags[@]}" -e "${R_PAT[$i]}" "$tmp" | cut -f1,2 | sort -u || true)
done

if [ "$high" -gt 0 ]; then
  info "BLOCKED: $high high-confidence finding(s). Unstage or remove the sensitive content; do not commit."
  [ "$review" -gt 0 ] && info "Also $review item(s) to review."
  exit 1
fi
if [ "$review" -gt 0 ]; then
  info "OK with $review item(s) to review: inspect them (locations above) and ask the user if unsure."
else
  info "OK: no secrets detected in staged changes."
fi
exit 0
