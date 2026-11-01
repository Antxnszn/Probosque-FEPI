#!/usr/bin/env bash
# Suite de pruebas de seguridad de la skill commit-and-pr.
#
# Cada prueba ejecuta los scripts REALES de ../scripts contra repositorios desechables
# (remotos bare locales) y contra un `gh` simulado (tests/fake-gh/gh). Nada toca la red,
# tu configuración global de Git ni repositorios reales.
#
# Uso:  bash tests/run-tests.sh
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SCRIPTS=$(cd "$HERE/../scripts" && pwd)
chmod +x "$HERE/fake-gh/gh" "$SCRIPTS"/*.sh
export PATH="$HERE/fake-gh:$PATH"

SANDBOX=$(mktemp -d "${TMPDIR:-/tmp}/skill-test-sandbox.XXXXXX")
trap 'rm -rf "$SANDBOX"' EXIT

# Aislamiento total de la configuración de Git del usuario.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0
export GIT_AUTHOR_NAME="Test Runner" GIT_AUTHOR_EMAIL="test@example.com"
export GIT_COMMITTER_NAME="Test Runner" GIT_COMMITTER_EMAIL="test@example.com"

export FAKE_GH_DIR="$SANDBOX/ghfix"
mkdir -p "$FAKE_GH_DIR"
: >"$FAKE_GH_DIR/calls.log"

echo "=== Inicializando entorno de pruebas en $SANDBOX ==="

# ------------------------------------------------------------------ utilidades
T=0 FAILS=0
begin() { T=$((T + 1)); printf '[Test %02d] %s... ' "$T" "$1"; }
ok() { printf 'PASS%s\n' "${1:+ ($1)}"; }
bad() { printf 'FAIL%s\n' "${1:+ ($1)}"; FAILS=$((FAILS + 1)); }

# run_in DIR CMD... -> RC, OUT (stdout), ERR (stderr)
run_in() {
  local d=$1
  shift
  RC=0
  OUT=$(cd "$d" && "$@" 2>"$SANDBOX/.err") || RC=$?
  ERR=$(cat "$SANDBOX/.err")
}
has() { grep -qF -- "$1" <<<"$2"; }
branch_exists() { git -C "$1" show-ref --verify -q "refs/heads/$2"; }
reset_calls() { : >"$FAKE_GH_DIR/calls.log"; }
nocalls() { ! grep -qE "$1" "$FAKE_GH_DIR/calls.log"; }

seed_repo() { # BARE -> repo bare con main y un commit
  local bare=$1 seed
  seed=$(mktemp -d "$SANDBOX/seed.XXXXXX")
  git init -q -b main "$seed"
  (cd "$seed" && echo init >README.md && git add README.md && git commit -q -m "chore: initial commit")
  git init -q --bare -b main "$bare"
  git -C "$seed" push -q "$bare" main
}

write_repo_fixture() { # slug isFork parentSlug defaultBranch
  jq -n --arg n "$1" --argjson fork "$2" --arg p "$3" --arg d "$4" '
    {nameWithOwner: $n, isFork: $fork,
     parent: (if $p == "" then null else {name: ($p | split("/")[1]), owner: {login: ($p | split("/")[0])}} end),
     defaultBranchRef: {name: $d}}' >"$FAKE_GH_DIR/repo-${1//\//__}.json"
}

pr_json() { # number state head base headOid ownerLogin repoName mergeOid
  jq -n --argjson n "$1" --arg st "$2" --arg head "$3" --arg base "$4" --arg oid "$5" \
    --arg owner "$6" --arg name "$7" --arg merge "$8" '
    {number: $n, url: ("https://github.com/x/y/pull/" + ($n | tostring)), state: $st,
     baseRefName: $base, headRefName: $head, headRefOid: $oid,
     headRepository: {name: $name}, headRepositoryOwner: {login: $owner},
     isCrossRepository: false, mergeCommit: (if $merge == "" then null else {oid: $merge} end)}'
}
write_prs() { # repoSlug json...
  local f="$FAKE_GH_DIR/prs-${1//\//__}.json"
  shift
  printf '%s\n' "$@" | jq -s '.' >"$f"
}

# mundo simple: acme/app con origin -> remoto bare local (URL con forma de GitHub vía insteadOf)
mk_world() { # NAME -> W, WORK
  W=$SANDBOX/$1
  mkdir -p "$W"
  seed_repo "$W/acme-app.git"
  git clone -q "$W/acme-app.git" "$W/work" 2>/dev/null
  WORK=$W/work
  git -C "$WORK" config "url.$W/acme-app.git.insteadOf" "https://github.com/acme/app.git"
  git -C "$WORK" remote set-url origin https://github.com/acme/app.git
  git -C "$WORK" fetch -q origin
  write_repo_fixture acme/app false "" main
  rm -f "$FAKE_GH_DIR"/prs-*.json "$FAKE_GH_DIR/next-pr"
  reset_calls
}

# mundo con fork: me/app (fork de org/app); remoto "upstream" apunta a un repo OBSOLETO (old/app)
mk_fork_world() { # NAME -> W, WORK
  W=$SANDBOX/$1
  mkdir -p "$W"
  seed_repo "$W/org-app.git"
  git clone -q --bare "$W/org-app.git" "$W/me-app.git" 2>/dev/null
  seed_repo "$W/old-app.git"
  git clone -q "$W/me-app.git" "$W/work" 2>/dev/null
  WORK=$W/work
  local pair
  for pair in me:me-app org:org-app old:old-app; do
    git -C "$WORK" config "url.$W/${pair#*:}.git.insteadOf" "https://github.com/${pair%%:*}/app.git"
  done
  git -C "$WORK" remote set-url origin https://github.com/me/app.git
  git -C "$WORK" remote add upstream https://github.com/old/app.git
  git -C "$WORK" remote add org https://github.com/org/app.git
  git -C "$WORK" fetch -q --all
  write_repo_fixture me/app true org/app main
  write_repo_fixture org/app false "" main
  write_repo_fixture old/app false "" main
  rm -f "$FAKE_GH_DIR"/prs-*.json "$FAKE_GH_DIR/next-pr"
  reset_calls
}

commit_file() { # dir file content msg
  (cd "$1" && printf '%s\n' "$3" >"$2" && git add -- "$2" && git commit -q -m "$4")
}
feature_branch() { # WORK NAME FILE CONTENT -> rama con 1 commit, subida con tracking
  git -C "$1" checkout -q main
  git -C "$1" checkout -q -b "$2"
  commit_file "$1" "$3" "$4" "feat: add $3"
  git -C "$1" push -q -u origin "$2" 2>/dev/null
}
gh_squash() { # BARE BRANCH -> imprime el OID del squash (simula "Squash and merge" de GitHub)
  local tmp
  tmp=$(mktemp -d "$SANDBOX/sim.XXXXXX")
  git clone -q "$1" "$tmp/c" 2>/dev/null
  (cd "$tmp/c" && git merge -q --squash "origin/$2" && git commit -q -m "feat: squash merge (#1)" && git push -q origin main) >/dev/null 2>&1
  git -C "$tmp/c" rev-parse HEAD
}
gh_merge_commit() { # BARE BRANCH -> imprime el OID del merge commit
  local tmp
  tmp=$(mktemp -d "$SANDBOX/sim.XXXXXX")
  git clone -q "$1" "$tmp/c" 2>/dev/null
  (cd "$tmp/c" && git merge -q --no-ff -m "Merge pull request #1" "origin/$2" && git push -q origin main) >/dev/null 2>&1
  git -C "$tmp/c" rev-parse HEAD
}
cleanup() { # WORK BRANCH [repoSlug]  (usa acme/app salvo que se indique)
  local slug=${3:-acme/app}
  run_in "$1" bash "$SCRIPTS/post-merge-cleanup.sh" --branch "$2" --base-repo "$slug" \
    --base-remote origin --base-branch main --head-repo "$slug"
}

# ------------------------------------------------------------------ pruebas
# TEST 1 ---------------------------------------------------------------------
begin "Preflight rechaza repositorio bare y HEAD desacoplado"
mk_world t1
run_in "$W/acme-app.git" bash "$SCRIPTS/preflight.sh"
rc_bare=$RC
run_in "$WORK" bash "$SCRIPTS/preflight.sh"
rc_ok=$RC
has 'CURRENT_BRANCH=main' "$OUT" || rc_ok=99
git -C "$WORK" checkout -q --detach
run_in "$WORK" bash "$SCRIPTS/preflight.sh"
rc_det=$RC
if [ "$rc_bare" -ne 0 ] && [ "$rc_ok" -eq 0 ] && [ "$rc_det" -ne 0 ]; then ok; else bad "bare=$rc_bare ok=$rc_ok detached=$rc_det"; fi

# TEST 2 ---------------------------------------------------------------------
begin "Bloqueo de PR con commits pero diff efectivo vacío (rc 4), sin commits (rc 3); diff real pasa"
mk_world t2
git -C "$WORK" checkout -q -b feat/reverted
commit_file "$WORK" temp.txt temp "feat: add temp"
git -C "$WORK" rm -q temp.txt && git -C "$WORK" commit -q -m "revert: remove temp"
run_in "$WORK" bash "$SCRIPTS/check-diff.sh" --base-ref origin/main --head-ref feat/reverted
rc_empty=$RC
git -C "$WORK" checkout -q main && git -C "$WORK" checkout -q -b feat/none
run_in "$WORK" bash "$SCRIPTS/check-diff.sh" --base-ref origin/main
rc_none=$RC
git -C "$WORK" checkout -q main && git -C "$WORK" checkout -q -b feat/real
commit_file "$WORK" real.txt real "feat: real change"
run_in "$WORK" bash "$SCRIPTS/check-diff.sh" --base-ref origin/main
if [ "$rc_empty" -eq 4 ] && [ "$rc_none" -eq 3 ] && [ "$RC" -eq 0 ] && has 'AHEAD_COUNT=1' "$OUT"; then
  ok "empty=$rc_empty none=$rc_none real=$RC"
else bad "empty=$rc_empty none=$rc_none real=$RC"; fi

# TEST 3 ---------------------------------------------------------------------
begin "Detección de desincronización local/remoto con git ls-remote (rc 5)"
mk_world t3
feature_branch "$WORK" feat/sync-check sync.txt v1
run_in "$WORK" bash "$SCRIPTS/verify-push.sh" --remote origin --branch feat/sync-check
rc_synced=$RC
commit_file "$WORK" sync.txt v2-unpushed "feat: v2 local only"
run_in "$WORK" bash "$SCRIPTS/verify-push.sh" --remote origin --branch feat/sync-check
rc_diff=$RC
run_in "$WORK" bash "$SCRIPTS/verify-push.sh" --remote origin --branch feat/never-pushed
if [ "$rc_synced" -eq 0 ] && [ "$rc_diff" -eq 5 ] && [ "$RC" -eq 5 ]; then ok; else bad "synced=$rc_synced diff=$rc_diff missing=$RC"; fi

# TEST 4 ---------------------------------------------------------------------
begin "Squash merge + commit local extra: git branch -D bloqueado"
mk_world t4
feature_branch "$WORK" feat/squash-ahead a.txt v1
V1=$(git -C "$WORK" rev-parse HEAD)
SQ=$(gh_squash "$W/acme-app.git" feat/squash-ahead)
commit_file "$WORK" a.txt v2-local-only "feat: v2 local only"
write_prs acme/app "$(pr_json 5 MERGED feat/squash-ahead main "$V1" acme app "$SQ")"
cleanup "$WORK" feat/squash-ahead
if [ "$RC" -eq 6 ] && branch_exists "$WORK" feat/squash-ahead; then ok "rc=6, rama intacta"; else bad "rc=$RC"; fi

# TEST 5 ---------------------------------------------------------------------
begin "Squash merge verificado: -D permitido, base sincronizada, rama eliminada"
mk_world t5
feature_branch "$WORK" feat/squash-ok a.txt feature-a
commit_file "$WORK" b.txt feature-b "feat: part 2"
git -C "$WORK" push -q origin feat/squash-ok 2>/dev/null
HEAD_OID=$(git -C "$WORK" rev-parse HEAD)
SQ=$(gh_squash "$W/acme-app.git" feat/squash-ok)
write_prs acme/app "$(pr_json 6 MERGED feat/squash-ok main "$HEAD_OID" acme app "$SQ")"
git -C "$WORK" fetch -q origin
if git -C "$WORK" merge-base --is-ancestor feat/squash-ok origin/main; then
  bad "el squash no debería conservar ancestría"
else
  cleanup "$WORK" feat/squash-ok
  cur=$(git -C "$WORK" symbolic-ref --short HEAD)
  if [ "$RC" -eq 0 ] && has 'CLEANUP_MODE=D' "$OUT" && ! branch_exists "$WORK" feat/squash-ok &&
    [ "$cur" = main ] && [ "$(git -C "$WORK" rev-parse main)" = "$(git -C "$WORK" rev-parse origin/main)" ] &&
    has "Recover with: git branch feat/squash-ok $HEAD_OID" "$ERR"; then
    ok
  else bad "rc=$RC cur=$cur err=$ERR"; fi
fi

# TEST 6 ---------------------------------------------------------------------
begin "Merge commit normal: -d sin consultar a GitHub"
mk_world t6
feature_branch "$WORK" feat/plain-merge a.txt one
gh_merge_commit "$W/acme-app.git" feat/plain-merge >/dev/null
reset_calls
export FAKE_GH_FAIL=1
cleanup "$WORK" feat/plain-merge
unset FAKE_GH_FAIL
if [ "$RC" -eq 0 ] && has 'CLEANUP_MODE=d' "$OUT" && ! branch_exists "$WORK" feat/plain-merge && nocalls '^pr '; then
  ok "sin llamadas a gh pr"
else bad "rc=$RC err=$ERR"; fi

# TEST 7 ---------------------------------------------------------------------
begin "mergeCommit que no es ancestro de la base: -D bloqueado"
mk_world t7
feature_branch "$WORK" feat/rewritten a.txt v1
V1=$(git -C "$WORK" rev-parse HEAD)
gh_squash "$W/acme-app.git" feat/rewritten >/dev/null
git -C "$WORK" checkout -q -b side main
commit_file "$WORK" side.txt side "chore: commit fuera de la base"
SIDE=$(git -C "$WORK" rev-parse HEAD)
git -C "$WORK" checkout -q feat/rewritten
write_prs acme/app "$(pr_json 7 MERGED feat/rewritten main "$V1" acme app "$SIDE")"
cleanup "$WORK" feat/rewritten
if [ "$RC" -eq 6 ] && has 'not in the history' "$ERR" && branch_exists "$WORK" feat/rewritten; then ok; else bad "rc=$RC err=$ERR"; fi

# TEST 8 ---------------------------------------------------------------------
begin "PR abierto o cerrado sin fusionar: nunca se borra"
mk_world t8
feature_branch "$WORK" feat/not-merged a.txt v1
V1=$(git -C "$WORK" rev-parse HEAD)
# El mergeCommit es válido (está en la base) a propósito: así solo el estado del PR puede impedir el borrado.
MB=$(git -C "$WORK" rev-parse origin/main)
write_prs acme/app "$(pr_json 8 OPEN feat/not-merged main "$V1" acme app "$MB")"
cleanup "$WORK" feat/not-merged
rc_open=$RC
write_prs acme/app "$(pr_json 8 CLOSED feat/not-merged main "$V1" acme app "$MB")"
cleanup "$WORK" feat/not-merged
if [ "$rc_open" -eq 6 ] && [ "$RC" -eq 6 ] && branch_exists "$WORK" feat/not-merged; then ok; else bad "open=$rc_open closed=$RC"; fi

# TEST 9 ---------------------------------------------------------------------
begin "Árbol sucio: la limpieza aborta antes de cambiar de rama"
mk_world t9
feature_branch "$WORK" feat/dirty a.txt v1
V1=$(git -C "$WORK" rev-parse HEAD)
SQ=$(gh_squash "$W/acme-app.git" feat/dirty)
write_prs acme/app "$(pr_json 9 MERGED feat/dirty main "$V1" acme app "$SQ")"
echo "cambio sin commit" >>"$WORK/README.md"
cleanup "$WORK" feat/dirty
cur=$(git -C "$WORK" symbolic-ref --short HEAD)
if [ "$RC" -ne 0 ] && branch_exists "$WORK" feat/dirty && [ "$cur" = feat/dirty ]; then ok; else bad "rc=$RC cur=$cur"; fi

# TEST 10 --------------------------------------------------------------------
begin "Fast-forward imposible: no se borra nada (fail-safe, no transaccional)"
mk_world t10
feature_branch "$WORK" feat/ff-fail a.txt v1
V1=$(git -C "$WORK" rev-parse HEAD)
SQ=$(gh_squash "$W/acme-app.git" feat/ff-fail)
git -C "$WORK" checkout -q main
commit_file "$WORK" local-only.txt x "chore: commit local en main"
git -C "$WORK" checkout -q feat/ff-fail
write_prs acme/app "$(pr_json 10 MERGED feat/ff-fail main "$V1" acme app "$SQ")"
cleanup "$WORK" feat/ff-fail
if [ "$RC" -ne 0 ] && branch_exists "$WORK" feat/ff-fail && has 'Nothing was deleted' "$ERR"; then ok; else bad "rc=$RC err=$ERR"; fi

# TEST 11 --------------------------------------------------------------------
begin "Nunca se limpia la rama base"
mk_world t11
cleanup "$WORK" main
if [ "$RC" -eq 6 ] && branch_exists "$WORK" main; then ok; else bad "rc=$RC"; fi

# TEST 11b -------------------------------------------------------------------
begin "Rama reutilizada: la limpieza elige el PR cuyo head coincide con el commit exacto"
mk_world t11b
feature_branch "$WORK" feat/reused a.txt first
OLD=$(git -C "$WORK" rev-parse HEAD)
SQ1=$(gh_squash "$W/acme-app.git" feat/reused)
git -C "$WORK" fetch -q origin && git -C "$WORK" checkout -q main && git -C "$WORK" merge -q --ff-only origin/main
git -C "$WORK" branch -q -D feat/reused && git -C "$WORK" push -q origin --delete feat/reused 2>/dev/null
feature_branch "$WORK" feat/reused b.txt second
NEW=$(git -C "$WORK" rev-parse HEAD)
SQ2=$(gh_squash "$W/acme-app.git" feat/reused)
write_prs acme/app "$(pr_json 30 MERGED feat/reused main "$OLD" acme app "$SQ1")" "$(pr_json 31 MERGED feat/reused main "$NEW" acme app "$SQ2")"
cleanup "$WORK" feat/reused
if [ "$RC" -eq 0 ] && has 'CLEANUP_MODE=D' "$OUT" && ! branch_exists "$WORK" feat/reused; then ok; else bad "rc=$RC err=$ERR"; fi

# TEST 12 --------------------------------------------------------------------
begin "select-pr: forks, ramas reutilizadas y ambigüedad (nunca elige el primero)"
mk_world t12
H=1111111111111111111111111111111111111111
write_prs acme/app \
  "$(pr_json 1 OPEN feat/x main "$H" other app "")" \
  "$(pr_json 2 OPEN feat/x main "$H" me app "")" \
  "$(pr_json 3 MERGED feat/y main aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa me app aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1)" \
  "$(pr_json 4 MERGED feat/y main bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb me app bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1)"
sel() { run_in "$WORK" bash "$SCRIPTS/select-pr.sh" --base-repo acme/app "$@"; }
sel --head-branch feat/x --head-repo me/app --state open
a=$RC; has 'PR_NUMBER=2' "$OUT" || a=98
sel --head-branch feat/x --head-repo other/app --state open
b=$RC; has 'PR_NUMBER=1' "$OUT" || b=98
sel --head-branch feat/x --head-repo ghost/app
c=$RC
sel --head-branch feat/y --head-repo me/app
d=$RC
sel --head-branch feat/y --head-repo me/app --head-oid bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
e=$RC; has 'PR_NUMBER=4' "$OUT" || e=98
sel --head-branch feat/x --head-repo ME/APP --state open
f=$RC; has 'PR_NUMBER=2' "$OUT" || f=98
if [ "$a" -eq 0 ] && [ "$b" -eq 0 ] && [ "$c" -eq 10 ] && [ "$d" -eq 11 ] && [ "$e" -eq 0 ] && [ "$f" -eq 0 ]; then
  ok
else bad "me=$a other=$b none=$c ambiguo=$d porOID=$e mayúsculas=$f"; fi

# TEST 13 --------------------------------------------------------------------
begin "gh pr list nunca recibe 'owner:branch' en --head; gh pr view siempre lleva --repo"
if ! grep -E '^pr list ' "$FAKE_GH_DIR/calls.log" | grep -qE -- '--head [^ ]*:'; then
  if grep -E '^pr view ' "$FAKE_GH_DIR/calls.log" | grep -qv -- '--repo '; then bad "pr view sin --repo"; else ok; fi
else bad "se usó owner:branch en pr list"; fi

# TEST 14 --------------------------------------------------------------------
begin "Fork: el repo base sale del padre en GitHub; un remoto 'upstream' obsoleto NO se asume"
mk_fork_world t14
git -C "$WORK" checkout -q -b feat/x
run_in "$WORK" bash "$SCRIPTS/resolve-repos.sh"
if [ "$RC" -eq 0 ]; then
  eval "$OUT"
  if [ "$BASE_REPO" = org/app ] && [ "$BASE_REMOTE" = org ] && [ "$BASE_REPO_SOURCE" = fork-parent ] &&
    [ "$IS_CROSS_REPO" = 1 ] && [ "$HEAD_SPEC" = me:feat/x ] && [ "$HEAD_REMOTE" = origin ] && [ "$BASE_BRANCH" = main ]; then
    ok "base=$BASE_REPO via remoto '$BASE_REMOTE'"
  else bad "base=$BASE_REPO remote=$BASE_REMOTE spec=$HEAD_SPEC"; fi
else bad "rc=$RC err=$ERR"; fi

# TEST 15 --------------------------------------------------------------------
begin "Sin remoto local que coincida con el repo base: se detiene (rc 3)"
mk_fork_world t15
git -C "$WORK" remote remove org
git -C "$WORK" checkout -q -b feat/x
run_in "$WORK" bash "$SCRIPTS/resolve-repos.sh"
if [ "$RC" -eq 3 ] && [ -z "$OUT" ]; then ok; else bad "rc=$RC out=$OUT"; fi

# TEST 16 --------------------------------------------------------------------
begin "--base-repo explícito (PR dentro del propio fork) respeta la orden del usuario"
mk_fork_world t16
git -C "$WORK" checkout -q -b feat/x
run_in "$WORK" bash "$SCRIPTS/resolve-repos.sh" --base-repo me/app
if [ "$RC" -eq 0 ]; then
  eval "$OUT"
  if [ "$BASE_REPO" = me/app ] && [ "$BASE_REMOTE" = origin ] && [ "$IS_CROSS_REPO" = 0 ] && [ "$HEAD_SPEC" = feat/x ] && [ "$BASE_REPO_SOURCE" = override ]; then
    ok
  else bad "base=$BASE_REPO remote=$BASE_REMOTE spec=$HEAD_SPEC"; fi
else bad "rc=$RC err=$ERR"; fi

# TEST 17 --------------------------------------------------------------------
begin "create-pr (mismo repo): usa --repo y --head sin prefijo"
mk_world t17
feature_branch "$WORK" feat/ok a.txt hello
printf 'cuerpo\n' >"$SANDBOX/body.md"
cpr() { run_in "$WORK" bash "$SCRIPTS/create-pr.sh" --head-remote origin --head-branch "$1" --head-repo acme/app \
  --head-spec "$1" --base-remote origin --base-repo acme/app --base-branch main --title "feat: add a" --body-file "$SANDBOX/body.md"; }
cpr feat/ok
line=$(grep '^pr create ' "$FAKE_GH_DIR/calls.log" || true)
if [ "$RC" -eq 0 ] && has 'PR_CREATED=1' "$OUT" && has '--repo acme/app' "$line" && has '--head feat/ok' "$line"; then ok; else bad "rc=$RC line=$line err=$ERR"; fi

# TEST 18 --------------------------------------------------------------------
begin "create-pr (fork): --repo del repo base y --head owner:branch"
mk_fork_world t18
git -C "$WORK" checkout -q -b feat/x
commit_file "$WORK" a.txt hello "feat: add a"
git -C "$WORK" push -q -u origin feat/x 2>/dev/null
run_in "$WORK" bash "$SCRIPTS/create-pr.sh" --head-remote origin --head-branch feat/x --head-repo me/app \
  --head-spec me:feat/x --base-remote org --base-repo org/app --base-branch main --title "feat: add a" --body-file "$SANDBOX/body.md"
line=$(grep '^pr create ' "$FAKE_GH_DIR/calls.log" || true)
if [ "$RC" -eq 0 ] && has '--repo org/app' "$line" && has '--base main' "$line" && has '--head me:feat/x' "$line"; then ok; else bad "rc=$RC line=$line err=$ERR"; fi

# TEST 19 --------------------------------------------------------------------
begin "create-pr: no sube nada sin push (rc 5), rechaza diff vacío (rc 4), no duplica PR abierto, no elige entre varios (rc 11)"
mk_world t19
git -C "$WORK" checkout -q -b feat/local-only
commit_file "$WORK" a.txt hello "feat: add a"
cpr feat/local-only
r5=$RC
git -C "$WORK" checkout -q main && git -C "$WORK" checkout -q -b feat/empty
commit_file "$WORK" t.txt t "feat: t"
git -C "$WORK" rm -q t.txt && git -C "$WORK" commit -q -m "revert: t"
git -C "$WORK" push -q -u origin feat/empty 2>/dev/null
cpr feat/empty
r4=$RC
feature_branch "$WORK" feat/dup b.txt dup
OID=$(git -C "$WORK" rev-parse HEAD)
write_prs acme/app "$(pr_json 20 OPEN feat/dup main "$OID" acme app "")"
reset_calls
cpr feat/dup
rdup=$RC; dupout=$OUT
nocalls '^pr create ' || rdup=97
write_prs acme/app "$(pr_json 21 OPEN feat/dup main "$OID" acme app "")" "$(pr_json 22 OPEN feat/dup main "$OID" acme app "")"
reset_calls
cpr feat/dup
r11=$RC
nocalls '^pr create ' || r11=97
if [ "$r5" -eq 5 ] && [ "$r4" -eq 4 ] && [ "$rdup" -eq 0 ] && has 'PR_EXISTS=1' "$dupout" && [ "$r11" -eq 11 ]; then
  ok
else bad "sinPush=$r5 vacío=$r4 existente=$rdup ambiguo=$r11"; fi

# TEST 20-27: secretos -------------------------------------------------------
mk_world sec
# Los secretos de prueba se arman en tiempo de ejecución para que este archivo no contenga literales detectables.
AWS="AKIA""IOSFODNN7EXAMPLE"
GHT="ghp_$(printf 'a%.0s' $(seq 1 36))"
scan() { git -C "$WORK" reset -q; run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"; }
stage() { (cd "$WORK" && printf '%s\n' "$2" >"$1" && git add -- "$1"); }

begin "Secretos: clave AWS en un archivo de nombre inocuo bloquea y no se imprime"
stage notes.txt "aws_key = \"$AWS\""
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$RC" -eq 1 ] && has 'aws-access-key-id notes.txt:1' "$OUT" && ! has 'IOSFODNN7EXAMPLE' "$OUT$ERR"; then ok; else bad "rc=$RC out=$OUT"; fi
git -C "$WORK" reset -q && rm -f "$WORK/notes.txt"

begin "Secretos: un archivo ya presente en el índice (no agregado por el agente) también se inspecciona"
stage preexisting.txt "token=$GHT"
stage harmless.txt "hola"
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$RC" -eq 1 ] && has 'github-token preexisting.txt:1' "$OUT" && ! has "$GHT" "$OUT$ERR"; then ok; else bad "rc=$RC out=$OUT"; fi
git -C "$WORK" reset -q && rm -f "$WORK"/preexisting.txt "$WORK"/harmless.txt

begin "Secretos: .env bloquea por nombre; .env.example e id_rsa.pub no"
stage .env "PORT=3000"
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
r_env=$RC
git -C "$WORK" reset -q && rm -f "$WORK/.env"
stage .env.example "PORT=3000"
stage id_rsa.pub "ssh-ed25519 AAAA clave-publica"
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$r_env" -eq 1 ] && [ "$RC" -eq 0 ]; then ok; else bad ".env=$r_env ejemplo/pub=$RC"; fi
git -C "$WORK" reset -q && rm -f "$WORK/.env.example" "$WORK/id_rsa.pub"

begin "Secretos: clave privada PEM bloquea"
stage service.txt "-----BEGIN ""RSA PRIVATE KEY-----"
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$RC" -eq 1 ] && has 'private-key service.txt:1' "$OUT"; then ok; else bad "rc=$RC out=$OUT"; fi
git -C "$WORK" reset -q && rm -f "$WORK/service.txt"

begin "Secretos: URL con credenciales bloquea; placeholders no"
URL_CREDS="postgres://admin:S3cretPass"
URL_CREDS+="@db.internal/app"
stage db.conf "url = $URL_CREDS"
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
r_url=$RC
git -C "$WORK" reset -q && rm -f "$WORK/db.conf"
stage db.conf 'url = postgres://${USER}:${PASS}@db.internal/app'
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$r_url" -eq 1 ] && [ "$RC" -eq 0 ]; then ok; else bad "real=$r_url placeholder=$RC"; fi
git -C "$WORK" reset -q && rm -f "$WORK/db.conf"

begin "Secretos: asignación sospechosa es REVIEW (no bloquea) y cambios limpios pasan"
stage config.py 'password = "hunter2hunter2"'
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
r_rev=$RC; rev_out=$OUT
git -C "$WORK" reset -q && rm -f "$WORK/config.py"
stage clean.py 'print("hola")'
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$r_rev" -eq 0 ] && has 'REVIEW hardcoded-secret config.py:1' "$rev_out" && [ "$RC" -eq 0 ]; then ok; else bad "review=$r_rev limpio=$RC"; fi
git -C "$WORK" reset -q && rm -f "$WORK/clean.py"

begin "Secretos: borrar un secreto del archivo (línea eliminada) no dispara el bloqueo"
(cd "$WORK" && printf 'k=%s\nok=1\n' "$AWS" >old.txt && git add old.txt && git commit -q -m "chore: legado")
(cd "$WORK" && printf 'ok=1\n' >old.txt && git add old.txt)
run_in "$WORK" bash "$SCRIPTS/check-secrets.sh"
if [ "$RC" -eq 0 ]; then ok; else bad "rc=$RC out=$OUT"; fi

# TEST 28 --------------------------------------------------------------------
begin "Ningún script modifica la configuración de Git explícitamente (solo lecturas con --get)"
if grep -nE 'git( -C [^ ]+)? config' "$SCRIPTS"/*.sh | grep -vE -- '--get|^\S+:[0-9]+:\s*#' >"$SANDBOX/cfg.txt" && [ -s "$SANDBOX/cfg.txt" ]; then
  bad "$(head -1 "$SANDBOX/cfg.txt")"
else ok; fi

echo
if [ "$FAILS" -eq 0 ]; then
  echo "=== Todos los tests de seguridad pasaron correctamente ($T/$T) ==="
else
  echo "=== $FAILS de $T tests FALLARON ==="
  exit 1
fi
