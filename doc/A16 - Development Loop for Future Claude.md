# Appendix A16 — Development Loop for Future Claude

A short runbook for any Claude instance picking up work in this repo (or a sibling project that adopts the same conventions). This is the four-step loop, the rule for each step, and the exact commands. For deeper context — slice principles, testing taxonomy, why no-fast-forward, GUI verification — see `doc/A04 - Development Workflow.md`. A16 is the *minimum* you must follow; A04 is the *full* contract.

## The four rules

1. **Write the design before you write the code.** Plans live in `doc/`, never only in conversation or commit messages.
2. **Every code change is a git commit.** No working-directory drift, no "I'll commit later." A reverted experiment is more valuable than an unsaved one.
3. **Every code change starts on a branch.** Never commit straight to `main`. The branch is your safety net and your slice's identity.
4. **A successful branch lands on `main` via `--no-ff` merge, gets a tag, and is deleted.** The tag is the slice's permanent address in the log; the branch is just scaffolding.

## 1. Write documentation in `doc/`

Before code, write the plan. Where it lives depends on its longevity:

- **Numbered docs (`doc/NNN - Title.md`)** — long-lived design contracts. Once committed, the doc is the spec the code implements. Update the doc in the *same commit* as the code change when behaviour drifts; never let the doc go stale.
- **Appendices (`doc/A01 - Title.md` … `doc/A99`)** — operator-facing, pragmatic notes (workflow, TODO, runtime context layout, bug investigation policy). Keep them numbered sequentially.
- **Bug docs (`doc/bugs/NNNN_<slug>.md`)** — pseudo-Jira. One file per investigation, updated incrementally as evidence accumulates. Close them with a resolution section.
- **Scratchbook (`doc/scratchbook/`)** — drafts, alternative proposals, design reports written *during* the conversation that produced a plan. Throwaway. They can stay untracked or fold into a numbered doc later.

When a slice touches a numbered doc, edit the doc in the same commit as the code that changes its semantics. The doc and the code must agree at every commit.

If you're starting work that doesn't have a doc yet, write one before the first commit. Even a one-page sketch is enough to make the slice plan visible.

## 2. Every code change is a git commit

The rule: **no working-directory state survives a slice**. When the slice is done, the working tree is clean and every change is in a commit on a branch.

Granularity: usually one commit per slice. Two if a fixup is needed (typo, missed file). Don't bundle unrelated changes — separate slices, separate branches.

```bash
git status                            # confirm working tree is clean before starting
git status                            # …and confirm at the end too
```

Stage explicitly. Avoid `git add -A` unless you've just verified `git status` and are sure nothing unwanted is in the working tree:

```bash
git add path/to/specific/file.swift path/to/another.swift
git commit -m "<subject line>

<body explaining why, not what>

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

Commit messages explain **why**, not what — the diff already shows what. One subject line under ~70 chars; body wrapped at ~72 cols. Reference the plan doc when relevant (`doc/017 step 9 — …`).

When a pre-commit hook fails, the commit didn't happen. Fix the issue, re-stage, and create a **new** commit — never `--amend` away the failure.

## 3. Always work on a branch

Branch off `main` before the first edit:

```bash
git checkout main
git pull --ff-only origin main        # optional: pull latest if remote may have moved
git checkout -b <slice-name>
```

Branch-name convention: kebab-case, intent-first, plan-step-prefixed when applicable.

- `step9-renderer-command-ingestion`
- `a4-extract-types-module`
- `b5b-wire-registry`
- `fix-mpr-clamp-out-of-bounds`

The prefix makes `git log --grep`, `git branch --list <prefix>*`, and cross-referencing with plan docs trivial.

While on the branch:
- Build clean (`swift build` with no new warnings on lines you touched).
- Run the focused test target for the affected slice (`make test-dv` for viewer slices, `make test-tc` for TestCenter).
- For GUI behaviour, exercise the actual app — type checks aren't enough.
- Capture test output once (`make test-dv 2>&1 | tee /tmp/last-test.log`); grep that log instead of re-running.

If the slice grows past ~a few hundred lines of diff, split it: branch a `<slice-name>-a`, ship it, then `<slice-name>-b` from main, and so on.

## 4. Merge → tag → delete

When the slice is ready (clean build, tests pass, code reviewed in your head):

```bash
git checkout main
git merge --no-ff <slice-name> -m "Merge: <one-line slice summary>"
git tag merge/<slice-name>
git branch -d <slice-name>
git push origin main                  # if a remote exists
git push origin merge/<slice-name>    # push the tag
```

Four things to understand:

- **`--no-ff` is mandatory.** It preserves the slice's branch shape in the log. Without it, bisecting failures becomes archaeology.
- **Tag every merged slice.** The tag is named `merge/<branch-name>` — searchable, sortable, and survives the branch deletion. Tags are the slice's permanent address; the branch is scaffolding that exists for the duration of development.
- **Delete the branch with `-d`, not `-D`.** `-d` refuses to delete an unmerged branch — that's a safety check. If `-d` fails, the merge didn't actually land; figure out why before forcing.
- **Push tags explicitly.** `git push origin main` doesn't push tags. Push them separately so the slice's address travels with the repo.

### When a branch should *not* be merged

If you decided the slice was wrong:

- Don't delete the branch. WIP-commit the work in progress with a descriptive message, then leave the branch alive locally:

  ```bash
  git add -A
  git commit -m "WIP — abandoned: <reason>"
  ```

- The branch (and its reflog) is your audit trail. Future-you may want to revisit the idea.
- Memory rule (`feedback_commit_before_revert.md`): WIP-commit *before* reverting; never use `git checkout --` to discard uncommitted work.

## The single-loop summary

```bash
# 1. Plan in doc/ if there isn't one yet.
$EDITOR doc/NNN-<title>.md

# 2-3. Branch + edit + commit.
git checkout -b <slice-name>
…edit code…
swift build                            # builds clean
make test-dv 2>&1 | tee /tmp/last-test.log
…run app, verify GUI behaviour if relevant…
git add <specific files>
git commit -m "<subject>"

# 4. Merge + tag + delete.
git checkout main
git merge --no-ff <slice-name> -m "Merge: <summary>"
git tag merge/<slice-name>
git branch -d <slice-name>
git push origin main
git push origin merge/<slice-name>
```

That's the loop. Repeat per slice.

## Things this appendix deliberately does *not* cover

- Slice decomposition strategy, plan-step prefixes, what makes a slice "small enough" — `doc/A04 §1`.
- Which test target to use for which kind of change — `doc/A04 §5`.
- GUI verification ritual (run-the-app rather than mock-test) — `doc/A04 §6`.
- Commit message anatomy beyond the bare minimum — `doc/A04 §7`.
- Anti-patterns (force-push, amend, --no-verify) — `doc/A04 §9`.

When in doubt, A04 is the canonical guide. A16 is the cheat sheet.

## Cross-references

- `doc/A04 - Development Workflow.md` — the full workflow contract this appendix summarises.
- `doc/A01 - TODO.md` — the live work queue. Slices come from here.
- `doc/A02 - Planned Features.md` — longer-horizon items not yet in TODO.
- `doc/bugs/` — closed bug investigations (mirror their structure when opening a new one).
