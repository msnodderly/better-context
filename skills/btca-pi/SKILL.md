---
name: btca-pi
description: Source-first repo/package research workflow for pi. Use when the user says "use btca-pi", asks to inspect a GitHub repository or local source tree before answering, wants source-grounded answers with citations, asks about pi internals/skills/extensions, or needs accurate current library/framework guidance instead of model memory.
---

# BTCA for Pi

Use this skill to answer from real source code and local docs, not memory.

## Source locations

- Long-lived editable source and forks: `~/src`.
- Research/cache clones: `~/.btca/agent/sandbox`.
- Helper script: `scripts/btca-source.sh` from this skill directory.

Prefer an existing `~/src/<repo>` checkout when it exists. Use the sandbox for third-party repos that are not already under `~/src`.

## Workflow

1. **Resolve sources**
   - If the user provides a GitHub URL, inspect that repo.
   - If the user names a known local repo, look under `~/src` first.
   - For pi questions, first check local pi docs and source:
     - `/opt/homebrew/lib/node_modules/@mariozechner/pi-coding-agent/README.md`
     - `/opt/homebrew/lib/node_modules/@mariozechner/pi-coding-agent/docs/`
     - `/opt/homebrew/lib/node_modules/@mariozechner/pi-coding-agent/examples/`
     - `~/src/pi-mono` if present

2. **Clone or update safely**
   - Use `scripts/btca-source.sh ensure <git-url> [name] [branch]` for sandbox resources.
   - For existing checkouts, run `git fetch --all --prune` when useful.
   - Do not discard local changes. If a checkout is dirty, fetch only and mention that it was not fast-forwarded.
   - Use shallow clones for new research repos unless history is relevant.

3. **Search before answering**
   - Use `rg`, `find`, `git grep`, and `read` to inspect source, tests, docs, and examples.
   - Follow references across files. Do not stop at the first plausible match.
   - Prefer implementation and tests over README claims when they conflict.

4. **Answer with citations**
   - Cite local paths for local files.
   - Include GitHub blob URLs when a remote URL and branch/commit are known.
   - State when docs and implementation disagree.
   - Include complete code snippets with imports when giving code.

## Useful commands

```bash
# List cached research repos
scripts/btca-source.sh list

# Clone/update a GitHub repo into ~/.btca/agent/sandbox
scripts/btca-source.sh ensure https://github.com/owner/repo.git repo-name main
```

## Output style

- Be concise but grounded.
- Use bullets or numbered lists.
- Include a `Sources` section for research answers.
- If something cannot be verified from source, label it as an assumption or limitation.
