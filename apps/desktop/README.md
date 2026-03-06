# @btca/desktop

First draft Tauri desktop shell for the btca web app.

## How it works

- Production loads the live app at `https://btca.dev/app`
- Local desktop development loads `http://localhost:5173/app`
- `apps/web` stays untouched, so Clerk, Convex, billing, saved threads, and the existing UI all behave the same way as the web app

## Dev

1. Install workspace dependencies from the repo root:

```sh
bun install
```

2. Start the existing web app in one terminal:

```sh
bun run dev:web
```

3. Start the Tauri shell in a second terminal:

```sh
bun run dev:desktop
```

The desktop shell expects the web app to already be running on `http://localhost:5173/app`.

## Notes

- This is intentionally a thin desktop shell for the current web experience, not a forked frontend
- It is a good first draft for packaging the existing product as a desktop app without redoing auth or backend flows
- Production currently depends on network access because it loads the hosted app at `https://btca.dev/app`
