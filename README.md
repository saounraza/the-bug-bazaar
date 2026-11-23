# The Bug Bazaar

A small store for developer gear (rubber ducks, mechanical keyboards, coffee and stickers), built with
React, TypeScript and Redux Toolkit. It runs without a backend: a Mock Service Worker implements the
[shared API contract](docs/api-contract.md) in the browser.

## Quick start (under 5 minutes)

Prerequisites: **Node.js 22 or newer** (CI uses Node 24) and npm.

```bash
git clone https://github.com/saounraza/the-bug-bazaar.git
cd the-bug-bazaar
npm ci          # install exact versions from package-lock.json
npm run dev     # http://localhost:5173
```

No `.env` file is needed: every environment variable has a working default. Sign in with the demo
account **demo@bugbazaar.dev / password123**.

## Scripts

| Script                 | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with hot reload and the mock API. |
| `npm run build`        | Type-check, then build the production bundle into `dist/`.  |
| `npm run preview`      | Serve the production build locally (mock API included).     |
| `npm run lint`         | Lint with oxlint. Warnings fail the run.                    |
| `npm run format`       | Format every file with Prettier.                            |
| `npm run format:check` | Check formatting without writing (used by CI).              |

## Environment variables

Copy `.env.example` to `.env.local` to override a value. All variables are optional.

| Variable            | Default | Purpose                                                               |
| ------------------- | ------- | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | (empty) | Prefix for every API request. Empty means same origin (`/api/...`).   |
| `VITE_ENABLE_MOCKS` | `true`  | Start the Mock Service Worker. Set `false` to talk to a real backend. |

## Folder structure

```
src/
  app/          App shell: store, router, layout, typed hooks
  api/          The data layer: HTTP client, contract types, RTK Query API
  features/     One folder per feature (products, cart, auth, orders, ...)
  components/   Shared presentational components
  hooks/        Reusable custom hooks
  lib/          Framework-free helpers (money, logging, ...)
  mocks/        Mock backend: seed data, HTTP + WebSocket handlers, chaos controls
docs/           Written tasks and decision records
```
