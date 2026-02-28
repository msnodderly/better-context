# AGENTS.md

## Critical Rules

- **ONLY use `bun`** - never npm/yarn
- **NEVER run dev/build commands** (`bun dev`, `bun build`)

## Source of Truth

When working on this project, apps/docs is the documentation for the server and cli. Make sure when changing something about how an endpoint or command works, you update the documentation in apps/docs. And if you change something that makes it different from the docs, ask me about it. This does not apply to apps/web or apps/sandbox.

## Commands

### Root Commands

- Type check all: `bun run check:all`
- Format all: `bun run format:all`

### Package-Specific Commands

After making changes in a specific package, run its check script:

| Package              | Check Command                 | Format Command                 |
| -------------------- | ----------------------------- | ------------------------------ |
| `apps/cli`           | `bun run check:cli`           | `bun run format:cli`           |
| `apps/web`           | `bun run check:web`           | `bun run format:web`           |
| `apps/server`        | `bun run check:server`        | `bun run format:server`        |
| `apps/sandbox`       | `bun run check:sandbox`       | `bun run format:sandbox`       |
| `apps/server-simple` | `bun run check:server-simple` | `bun run format:server-simple` |
| `packages/shared`    | `bun run check:shared`        | `bun run format:shared`        |

## Code Style

- **Runtime**: Bun only. No Node.js, npm, pnpm, vite, dotenv.
- **TypeScript**: Strict mode enabled. ESNext target.
- **Imports**: External packages first, then local. Use `.ts` extensions for local imports.
- **Bun APIs**: Prefer `Bun.file`, `Bun.serve`, `bun:sqlite`, `Bun.$` over Node equivalents.
- **Testing**: Use `bun:test` with `import { test, expect } from "bun:test"`.

## Cursor Cloud specific instructions

### Overview

Bun monorepo (Turborepo) with these core packages: `apps/server` (Hono HTTP API), `apps/cli` (TUI), `apps/web` (SvelteKit + Convex), `apps/sandbox`, `packages/shared`. See `README.md` "Development" section for full script reference.

### Running the server

Start the btca server on port 8080: `bun apps/server/src/index.ts`. The server requires no external database — it uses filesystem storage. It will auto-create a default config at `~/.config/btca/btca.config.jsonc` on first run. Health check: `curl http://localhost:8080/`.

### Type checking

`bun run check:all` will fail if `mint` (Mintlify CLI) is not installed, since `@btca/docs` uses `mint validate`. This is safe to ignore — run individual package checks instead (e.g. `bun run check:server`, `bun run check:cli`, `bun run check:web`).

### Testing

`bun run test:server` runs all server tests. Integration tests requiring AI API keys are gated behind `BTCA_RUN_INTEGRATION_TESTS=true` and are skipped by default. `bun run test:all` runs tests across all packages (currently only `btca-server` has tests).

### Web app (`apps/web`)

Requires external services (Clerk auth, Convex backend) and corresponding env vars. Type-checking works standalone via `bun run check:web`.
