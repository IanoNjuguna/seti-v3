---
name: commit
description: Commit current changes to git in atomic, scoped commits and optionally push to GitHub.
---

# Skill: Atomic Commit and Push to GitHub

## When to use

Use this skill when the user asks you to:

- Commit current work
- Save changes to git
- Push to GitHub
- Create a commit and push
- "Commit and push"

Do not use this skill for other git operations like rebasing, resetting, branching, or force-pushing.

## Core principle: atomic commits

**Never batch unrelated changes into a single commit.** Each commit should represent one logical change. A commit message like "update stuff" or a diff that touches landing pages, wireframes, and the design system all at once creates noise and makes review and rollback harder.

When multiple unrelated files are modified, group them by scope and commit each group separately.

## Safety rules

1. **Never push without explicit user confirmation.** Pushing is an outward-facing action that touches shared state.
2. **Never commit secrets.** If `.env`, key files, or credentials appear in `git status`, stop and warn the user.
3. **Never run destructive git commands** (`git reset`, `git rebase`, `git push --force`) using this skill.
4. **Respect `.gitignore`.** Do not stage files that should be ignored.
5. **Check the current branch** before committing. Warn the user if they are on `main` or `master` and the change looks experimental.
6. **Avoid `git add -A`.** Stage files deliberately by path or scope unless the user explicitly asks for an all-changes commit.

## Arguments

The skill accepts an optional argument string:

- `commit` — inspect changes, propose atomic groupings, commit each group
- `push` — commit atomically, then ask for confirmation before pushing
- `"<scope>: <description>"` — commit only files matching that scope with the given message
- `"<scope>: <description>" push` — commit matching files and ask to push
- `<scope>` — commit only files belonging to the named scope (e.g., `design`, `docs`, `chore`)

If no argument is provided, default to `commit`.

## Workflow

### Step 1: Inspect the repository state

Run:

```bash
git status --short
git branch --show-current
```

If there are no changes, tell the user there is nothing to commit.

### Step 2: Review and group changes

Run:

```bash
git diff --stat
```

Look at the modified files and propose logical groupings. Common scopes for this project:

- `design` — visual/design system changes (`03-design.html`, `index.html`)
- `docs` — wireframes, PRD, README
- `chore` — tooling, config, skill files
- `feat` — new backend/frontend functionality
- `fix` — bug fixes

If the changes clearly belong to separate scopes, propose multiple atomic commits. For example:

```
1. design: add minimalist landing page
   Files: index.html

2. design: update design system to warm monochrome palette
   Files: .github/prompts/03-design.html

3. docs: align wireframes and onboarding with new design voice
   Files: .github/prompts/00-wireframe.md, .github/prompts/02-onboarding.md

4. docs: standardize product name casing in PRD
   Files: .github/prompts/01-prd.md

5. chore: add commit-and-push skill
   Files: .agents/skills/commit/SKILL.md
```

Ask the user to confirm the groupings, or let them adjust.

### Step 3: Review each diff

For each proposed commit group, run:

```bash
git diff -- <files-in-group>
```

Summarize the changes in plain language. Flag any suspicious files (secrets, build outputs, dependencies).

### Step 4: Determine commit messages

If the user provided a commit message in the argument, use it for the matching scope.

If not, generate concise commit messages following this convention:

```
<scope>: <description>
```

Examples:

- `design: add minimalist landing page`
- `docs: align wireframes with new design system`
- `chore: remove emojis from chat templates`
- `feat: add recipient validation before quoting`

Use lowercase for the description. Keep the first line under 72 characters. If the change is large or complex, add a blank line and a short body explaining why.

### Step 5: Confirm before committing

Show the proposed commits to the user and ask for confirmation before running any `git commit`, unless the user already provided an explicit message and scope.

If the user says no or asks to revise, update the groupings or messages and ask again.

### Step 6: Stage and commit atomically

For each confirmed commit group, run:

```bash
git add <file1> <file2> ...
git commit -m "<scope>: <description>"
```

Report each short commit hash and summary back to the user.

### Step 7: Push (only if requested and confirmed)

If the argument includes `push` or the user explicitly asks to push after committing:

1. State the current branch and remote.
2. Ask for explicit confirmation: "Push these N commits to `origin/<branch>`?"
3. Only after confirmation, run:

```bash
git push origin <branch>
```

Report the result. If the push fails, explain the error and do not retry automatically.

## Example invocations

```
Skill: commit
```
> Inspects changes, proposes atomic groupings, asks for confirmation, commits each group.

```
Skill: commit "design: add landing page"
```
> Commits only files matching the `design` scope with the provided message.

```
Skill: commit docs
```
> Commits only files in the `docs` scope with an auto-generated message.

```
Skill: commit push
```
> Commits atomically, then asks for confirmation before pushing.

```
Skill: commit "docs: update wireframes" push
```
> Commits docs-scope files with the provided message, then asks to push.

## Output format

After committing:

```
Committed <short-hash>: <message>
Committed <short-hash>: <message>
...
Branch: <branch>
```

After pushing (if confirmed):

```
Pushed N commits to origin/<branch>
Latest: <short-hash>
```
