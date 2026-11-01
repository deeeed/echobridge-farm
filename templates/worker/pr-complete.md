# PR-complete checklist (EchoBridge)

You are making an EchoBridge PR merge-ready: fix failing CI checks, address review comments, keep the branch current with `origin/{{DEFAULT_BRANCH}}` (merge, never rebase), validate, push the PR branch once, and reply to every handled comment. If blocked, write artifacts explaining why and run `{{TASK_DIR}}/mark blocked --reason "…"`.

**SINGLE PASS ONLY:** fix the checks and comments fetched in step 4, push once, reply, and finish. If CI or bots report new findings after your push, the orchestrator re-invokes this flow.

## Checklist

- [ ] **1. Start**: read the repository's `AGENTS.md`, then `{{TASK_DIR}}/mark start` and `{{TASK_DIR}}/mark 1`.
- [ ] **2. Confirm branch**: `cd {{REPO}} && git branch --show-current` must be `{{BRANCH}}`.
- [ ] **3. Merge the default branch** and resolve conflicts minimally, preserving the PR intent:
  ```bash
  cd {{REPO}}
  git fetch origin {{DEFAULT_BRANCH}}
  git merge origin/{{DEFAULT_BRANCH}}
  node '{{FARMSLOT_DIR}}/projects/echobridge-farm/scripts/project.mjs' setup '{{REPO}}'
  ```
- [ ] **4. Fetch failing checks and all unresolved comments** (the `## Comment Summary` snapshot in TASK.md is preview only):
  ```bash
  unset GH_TOKEN
  gh pr checks {{PR_NUMBER}} --repo {{GH_REPO}}
  gh api "repos/{{GH_REPO}}/pulls/{{PR_NUMBER}}/comments" \
    --jq '.[] | select(.in_reply_to_id == null) | {source: "review_comment", id, author: .user.login, user_type: .user.type, body, path, line, html_url}'
  gh api "repos/{{GH_REPO}}/issues/{{PR_NUMBER}}/comments" \
    --jq '.[] | {source: "issue_comment", id, author: .user.login, user_type: .user.type, body, html_url}'
  gh pr view {{PR_NUMBER}} --repo {{GH_REPO}} --json reviews,reviewDecision,statusCheckRollup
  ```
  For each failing check, read its log (`gh run view <run-id> --repo {{GH_REPO}} --log-failed`). Start `{{TASK_DIR}}/artifacts/comments-report.md` listing every failing check and every actionable comment: source, author, id, file:line, summary, planned action. Skip status-only automation and record how many were skipped.
- [ ] **5. Triage** each failing check and comment as REAL, FALSE POSITIVE or OUT OF SCOPE after reading the PR diff and the surrounding code.
- [ ] **6. Apply minimal fixes** for REAL findings. Reproduce a failing check locally with the toolchain its workflow pins (read the workflow; do not rely on whatever version is on PATH), fix the cause rather than the test, and rerun that check until it passes. Regenerate generated files with the repository's own scripts. No unrelated refactors.
- [ ] **7. Self-review your fixes**: re-read the diff for correctness and `AGENTS.md` rules.
- [ ] **8. Commit and push once** (skip both when no code changed and the merge in step 3 was a no-op):
  ```bash
  cd {{REPO}}
  git add <intentional-files>
  git commit -m "fix: address PR feedback"
  SHA=$(git rev-parse --short HEAD)
  git push origin {{BRANCH}}
  ```
- [ ] **9. Reply to every actionable comment**: inline replies for `review_comment` (`gh api repos/{{GH_REPO}}/pulls/{{PR_NUMBER}}/comments/<ID>/replies -X POST -f body="Fixed in $SHA. …"`, or "Not applicable — …", or "Out of scope for this PR — …"), and one consolidated top-level reply for actionable `issue_comment` findings. Do not double-reply. Failing checks need no reply.
- [ ] **10. Finalize artifacts**: complete `comments-report.md` (triage, SHA pushed, replies, files changed, validation results including each check rerun locally). Write `{{TASK_DIR}}/artifacts/comments-triage.json` (one entry per comment: `comment_id`, `author_login`, `source_kind`, `path`, `line`, `triage`, `action`, `fixed_in_commit`) and `{{TASK_DIR}}/artifacts/family-scope.json` (`originalFamilyScopeSummary`, `currentTriggerSummary`, `scopeVerdict`, `notes`). Always write a non-empty `artifacts/learnings.md` (what failed, the cause, and what would have caught it sooner); completion requires it.
- [ ] **11. Signal**: `{{TASK_DIR}}/mark complete --mark-last`

## Rules

- Push only `{{BRANCH}}`, with a regular push. Never force-push or rebase. Never merge into the default branch.
- Inline replies are mandatory for handled review comments.
- Never edit `.github/workflows/**`, security-scan configuration (`.gitleaksignore`, `docs/open-source/*-ignores.json`, `*-dispositions.json`, `*-overrides.json`) or the human-review hash pins (`reviewed_hash(...)` in `scripts/audit-open-source-readiness.py`): those changes are Arthur's call. If a fix needs one, record the proposed change in `comments-report.md` and mark blocked.
- Never mention Claude/AI/LLM in commits, replies or PR text. After signaling, **STOP**.
