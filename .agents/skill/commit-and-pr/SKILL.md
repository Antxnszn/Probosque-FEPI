---
name: commit-and-pr
description: Commit local changes with Conventional Commits, push the branch, open a GitHub pull request against the correct repository (fork-aware), and safely clean up the local branch after the PR is merged. Use when the user asks to commit, push, open/create a PR, or to clean up/delete a branch after merge. Enforces secret screening, live push verification, empty-diff blocking, exact PR identification, and fail-safe branch deletion.
---

# commit-and-pr

Four parts, always in this order when more than one applies: **1 Preflight → 2 Commit → 3 Push & PR → 4 Fail-Safe Post-Merge Cleanup**.

All the checks that matter live in scripts, not in prose, so they cannot be skipped by accident. Run them; do not re-implement them by hand with weaker commands.

```bash
# S = absolute path of the scripts/ directory that sits next to this SKILL.md
S="<absolute path to this skill>/scripts"
```

Scripts print results as `KEY=VALUE` lines on **stdout** (safe to `eval`) and diagnostics on **stderr**. Exit codes:

| Exit | Meaning | What to do |
|---|---|---|
| 0 | OK | continue |
| 1 | precondition failed / high-confidence secret found | fix the cause, or stop and tell the user |
| 2 | usage error, or `gh`/`git` failed | report the error; do not retry with a different mechanism |
| 3 | no local remote matches the base repo, or no commits ahead | stop and ask the user |
| 4 | commits exist but the net diff is empty | do not open a PR; tell the user |
| 5 | local branch and remote tip differ | push/reconcile, then verify again |
| 6 | cleanup blocked by a safety check (nothing deleted) | report the reason; do not delete by hand |
| 10 / 11 | no PR / several PRs match | 10: proceed if creating; 11: stop and list candidates |

## Safety protocol (applies to every part)

1. **Never modify Git configuration explicitly**, except the branch-tracking metadata that Git creates automatically during the approved operations `git push --set-upstream` and `git checkout -b … --track`. **Never** alter global Git configuration, credentials, or authentication settings.
2. **No force.** Never `git push --force`, `--force-with-lease`, or `+refspec`, and never amend/rebase/reset commits that are already pushed, unless the user explicitly asks for that exact operation. A rejected push means stop and report.
3. **Never skip hooks or signing** (`--no-verify`, `--no-gpg-sign`) unless the user explicitly asks. If a hook fails, fix the cause and create the commit again.
4. **Never commit directly to the base branch.** Create a feature branch first.
5. **Stage explicit paths only.** Never `git add -A` / `git add .` unless the user explicitly says "commit everything" *and* you reviewed the full `git status` first.
6. **Never commit or print secrets.** The scan in Part 2 is mandatory. Never echo a credential back, not even partially.
7. **Never infer a repository from a remote's name.** `upstream` is a convention, not proof. Repository identity comes only from `resolve-repos.sh`.
8. **Never use `owner:branch` with `gh pr list --head` or `gh pr view`.** `gh pr list --head` does not support it and `gh pr view` does not document it. Find PRs only through `select-pr.sh`. (`gh pr create --head owner:branch` *is* supported and is what `create-pr.sh` uses for forks.)
9. **Never delete a branch by hand.** `git branch -d/-D` happens only inside `post-merge-cleanup.sh`.
10. **No destructive shortcuts**: no `git reset --hard`, `git clean`, `git checkout -- .`, `git stash drop`, or deleting remote branches unless the user asks.
11. **If a script stops you, you are stopped.** Report the reason in plain words. Do not work around it with a manual equivalent.
12. **Unattended runs:** when a decision is ambiguous (exit 3 or 11, unclear scope of changes), do the safe preparatory work, state the question, and stop. Do not guess.

---

## Part 1 — Preflight and context

```bash
R=$(bash "$S/preflight.sh" --need-gh) && eval "$R"   # REPO_ROOT, CURRENT_BRANCH
R=$(bash "$S/resolve-repos.sh") && eval "$R"         # see below
```

Always capture first and `eval` second (`R=$(…) && eval "$R"`). A bare `eval "$(…)"` hides the script's exit code, so a failed check would look like success.

`preflight.sh` rejects bare repositories and `.git` directories, detached HEAD, an in-progress merge/rebase/cherry-pick/revert/bisect, and a missing or unauthenticated `gh`.

`resolve-repos.sh` sets, explicitly and verifiably:

| Variable | Meaning |
|---|---|
| `HEAD_REMOTE`, `HEAD_REPO`, `HEAD_OWNER` | where the branch is pushed |
| `BASE_REPO` (`OWNER/REPO`), `BASE_REPO_SOURCE` | where the PR goes: `fork-parent` (from GitHub), `same-repo`, or `override` |
| `BASE_REMOTE`, `BASE_BRANCH`, `BASE_REF` | the local remote whose **URL** matches `BASE_REPO`, and the target branch |
| `IS_CROSS_REPO`, `HEAD_SPEC` | `HEAD_SPEC` is `owner:branch` for fork PRs, plain `branch` otherwise |
| `ON_BASE_BRANCH` | `1` if the current branch is the base branch |

- If the user said where the PR must go ("PR to the fork itself", "target `develop`"), pass `--base-repo OWNER/REPO` / `--base-branch NAME`.
- Exit **3** means no local remote points at `BASE_REPO`. Stop and ask the user; do not pick a remote by name and do not add one (that would edit Git config).

## Part 2 — Commit (Conventional Commits, selective staging, secret screening)

1. **Look first.** `git status --porcelain=v1` and `git diff --stat`. Decide which files belong to this task. Unrelated changes stay out; if scope is unclear, ask (or, unattended, commit only what this task changed and say so).
2. **Branch.** If `ON_BASE_BRANCH=1`, create a feature branch before committing:
   `git checkout -b <type>/<short-kebab-summary>` (no `--track`; Git sets tracking at first push). Then treat the new name as `CURRENT_BRANCH`, and re-run `resolve-repos.sh` so `HEAD_SPEC` is correct.
3. **Stage explicit paths:** `git add -- <path> [<path> …]`.
4. **Secret gate (mandatory, right before committing):**
   ```bash
   bash "$S/check-secrets.sh"
   ```
   It scans **everything staged**, including files someone else already staged, by file name and by the content of added lines, and prints rule + `path:line` without ever printing the secret.
   - Exit **1** (`HIGH`): do not commit. Unstage only files **you** staged (`git reset -q -- <path>`); if the user pre-staged them, stop and report. Never assume a file is safe because it is not called `.env`.
   - Exit 0 with `REVIEW` lines: look at each location; if still unsure, ask the user.
5. **Message** (Conventional Commits 1.0):
   ```
   <type>(<optional scope>)<!>: <imperative, lowercase description, no trailing period, ≤72 chars>

   <optional body: what and why, wrapped at ~72 columns>

   <optional footers: BREAKING CHANGE: …, Refs: #123, Closes #123>
   ```
   Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`. Use `!` or a `BREAKING CHANGE:` footer for breaking changes. If the user, the project (e.g. `CLAUDE.md`, `CONTRIBUTING`), or the environment prescribes commit trailers or attribution lines, follow them exactly; add none otherwise.
6. **Commit** with `git commit -F <file>` or a heredoc, then confirm with `git log -1 --stat`. If the diff mixes unrelated concerns, make several commits.

## Part 3 — Push and pull request

### 3.1 Push (never force)

```bash
if git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1; then
  git push "$HEAD_REMOTE" "$CURRENT_BRANCH"
else
  git push --set-upstream "$HEAD_REMOTE" "$CURRENT_BRANCH"
fi
```

A rejected (non-fast-forward) push: stop and report. Deciding between rebase and merge is the user's call.

### 3.2 PR text

Title: Conventional Commit style, ≤70 chars. Body in a temporary file (`mktemp`; delete it afterwards):

```markdown
## Summary
<1–3 sentences: what and why>

## Changes
- <notable change>

## Testing
<how it was verified; what was not>

## Notes
<breaking changes, follow-ups, `Closes #N` if the user mentioned an issue>
```

Never put secrets or internal-only URLs in the PR text. Pass `--draft` only if the user asked for a draft.

### 3.3 Create

```bash
bash "$S/create-pr.sh" \
  --head-remote "$HEAD_REMOTE" --head-branch "$CURRENT_BRANCH" --head-repo "$HEAD_REPO" --head-spec "$HEAD_SPEC" \
  --base-remote "$BASE_REMOTE" --base-repo "$BASE_REPO" --base-branch "$BASE_BRANCH" \
  --title "$PR_TITLE" --body-file "$PR_BODY_FILE"
```

`create-pr.sh` enforces, in this order, so none can be skipped:

1. **Live sync check.** `git ls-remote` of the branch on `HEAD_REMOTE` must equal the local commit (exit 5 otherwise).
2. **Effective diff.** After a fresh fetch, the net diff against the merge-base with `BASE_REF` must be non-empty. Commits ahead are not enough: add + revert cancels out (exit 4; exit 3 if nothing is ahead).
3. **Existing PR.** `select-pr.sh --state open` for this exact head repository + branch + base. One found → reports `PR_EXISTS=1` and its URL, creates nothing (the push already updated it). Several found → exit 11, never picks one.
4. **Create pinned to the base repository:** `gh pr create --repo "$BASE_REPO" --base … --head "$HEAD_SPEC" --title … --body-file …`. The target never depends on the working directory or remote names.

Report the PR URL (`PR_URL`) in one line.

---

## Part 4 — Fail-Safe Post-Merge Cleanup

Use when the user says the PR was merged, or asks to clean up / sync / delete the branch. This is **not transactional**: it runs in order and stops at the first failed check. A failure can leave the repo on the base branch (possibly fast-forwarded) but never with a branch deleted that was not verified.

```bash
BR="<branch to clean up>"                       # from the user, or CURRENT_BRANCH
R=$(bash "$S/resolve-repos.sh" --branch "$BR") && eval "$R"
bash "$S/post-merge-cleanup.sh" \
  --branch "$BR" --base-repo "$BASE_REPO" --base-remote "$BASE_REMOTE" \
  --base-branch "$BASE_BRANCH" --head-repo "$HEAD_REPO"
```

What it does, in order: refuses if tracked files are dirty → fetches the base remote → chooses the deletion mode → switches to the base branch (creating it with `--track` if missing) → `git merge --ff-only` to the fetched base → deletes only if the branch still points at the verified commit.

**Mode `-d`** (regular merge or fast-forward): the branch tip is already an ancestor of `BASE_REF`. Git itself proves nothing is lost, so GitHub is not consulted.

**Mode `-D`** (squash or rebase merge, where ancestry does not hold) is allowed **only if all of these are true**:

- exactly **one** PR matches the branch name, the head repository owner/name, **and** the exact local tip (`select-pr.sh --head-oid`), found with `gh pr list --repo "$BASE_REPO"` and then read with a single `gh pr view <number> --repo "$BASE_REPO"`;
- that PR is `MERGED`, into `BASE_BRANCH`;
- the PR head commit equals the local tip, so there are no extra or unpushed local commits;
- the `mergeCommit` GitHub recorded exists locally and is an **ancestor of `BASE_REF`** (detects a base history rewritten after the merge).

Anything else exits **6** with the reason and deletes nothing: PR open/closed-unmerged, no PR for this exact commit, several PRs, merged into another branch, merge commit missing or not in base history. Tell the user the reason and what they could do manually. Do not delete the branch yourself.

On success the output includes `Recover with: git branch <name> <oid>`; pass that line on to the user. Remote branches are never deleted here (GitHub usually removes them on merge). If the user asks, delete the remote branch afterwards with `git push "$HEAD_REMOTE" --delete "$BR"`, after confirming.

---

## Final report

Keep it short: what was committed (hash and subject), where it was pushed, the PR URL (or why none was opened), and, for Part 4, which branch was deleted and with which mode. If a safety check stopped the run, lead with that.

## Files

- `scripts/` — `lib.sh`, `preflight.sh`, `check-secrets.sh`, `resolve-repos.sh`, `check-diff.sh`, `verify-push.sh`, `select-pr.sh`, `create-pr.sh`, `post-merge-cleanup.sh`
- `tests/run-tests.sh` — runs the real scripts against throwaway repositories and a simulated `gh` (`tests/fake-gh/gh`). Run it after changing any script: `bash tests/run-tests.sh`.
