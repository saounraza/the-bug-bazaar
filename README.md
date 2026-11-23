# The Bug Bazaar

A small store for developer gear (rubber ducks, mechanical keyboards, coffee and stickers), built with
React 19, TypeScript and Redux Toolkit. It runs without a backend: a Mock Service Worker implements
the [shared API contract](docs/api-contract.md) in the browser, including a live stock WebSocket.

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

## What's in the store

- **Browse 5,000 products:** search, category, in-stock and sort filters kept in the URL
  (refresh, share and Back all work), a virtualized grid with infinite loading and arrow-key
  navigation, and a details page with Previous/Next.
- **Live stock** over a WebSocket, which reconnects on its own after a drop.
- **Cart** saved across reloads, with quantities capped at stock.
- **Checkout:** sign-in required, protected by an idempotency key so a retry never creates a
  second order, a 409 that names the sold-out item, and a confirmation page that polls the order
  status.
- **Errors handled in one place:** field errors (400), sign-out and return (401), a Not Found page
  (404), out of stock (409), retry (500). A crash shows a fallback screen and is logged.

### Mock controls (the 🐞 button, bottom right)

Trigger any state on purpose: add latency, make searches resolve out of order, force any endpoint
to return any of its documented errors, make an order "succeed but lose the response", expire
every session, drop the live connection, throw a render error, or reset everything. Settings are
saved in localStorage.

## Scripts

| Script                 | What it does                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with hot reload and the mock API.                                             |
| `npm run build`        | Type-check, then build the production bundle into `dist/`.                                              |
| `npm run preview`      | Serve the production build at http://localhost:4173 (mock API included).                                |
| `npm run typecheck`    | Run the TypeScript compiler in strict mode (no emit).                                                   |
| `npm run lint`         | Lint with oxlint. Warnings fail the run.                                                                |
| `npm test`             | Run the Vitest suite once (jsdom + MSW, 71 tests).                                                      |
| `npm run test:watch`   | Run Vitest in watch mode.                                                                               |
| `npm run format`       | Format every file with Prettier.                                                                        |
| `npm run format:check` | Check formatting without writing (used by CI).                                                          |
| `npm run perf`         | Time the product-list API handler (see `docs/performance.md`).                                          |
| `npm run a11y`         | Lighthouse accessibility on home, cart and login. Needs `npm run preview` running and Chrome installed. |

## Environment variables

Copy `.env.example` to `.env.local` to override a value. All variables are optional.

| Variable            | Default | Purpose                                                                             |
| ------------------- | ------- | ----------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | (empty) | Prefix for every API request. Empty means same origin (`/api/...`).                 |
| `VITE_ENABLE_MOCKS` | `true`  | Start the Mock Service Worker. Set `false` to talk to a real backend.               |
| `VITE_LOG_ENDPOINT` | (empty) | URL that receives error reports via `navigator.sendBeacon`.                         |
| `BASE_PATH`         | `/`     | Build-time only: the sub-path the app is served from (CI sets it for GitHub Pages). |

## Folder structure

```
src/
  app/          App shell: store, router, layout, persistence, typed hooks
  api/          The data layer: HTTP client, errors, RTK Query base API, WebSocket feed, contract types
  features/     One folder per feature: products, cart, auth, orders, devtools
  components/   Shared presentational components (AsyncView, status views, ErrorBoundary, ...)
  hooks/        Reusable custom hooks
  lib/          Framework-free helpers (money, logger, request state)
  mocks/        Mock backend: seed data, HTTP + WebSocket handlers, chaos controls
  test/         Test setup and renderApp()
perf/           Performance measurement scripts
scripts/        Image generator, Lighthouse runner
docs/           Written tasks and decision records
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Doc                                     | Contents                                                     |
| --------------------------------------- | ------------------------------------------------------------ |
| [decisions.md](docs/decisions.md)       | Every task: what I used, what I considered, and why          |
| [api-contract.md](docs/api-contract.md) | Endpoints, shapes, errors, extensions, how to trigger errors |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folders, data flow diagram, where state lives, patterns      |
| [auth.md](docs/auth.md)                 | Login flow, 401 handling, token storage trade-off            |
| [performance.md](docs/performance.md)   | Before/after measurements, memoization and virtualization    |
| [monitoring.md](docs/monitoring.md)     | Error boundaries, logging, three metrics to track            |
| [orders.md](docs/orders.md)             | Queue-based order design, email outage, double charges       |
| [glossary.md](docs/glossary.md)         | Six architecture terms with store examples                   |
| [ai-notes.md](docs/ai-notes.md)         | AI uses, mistakes and how they were caught                   |
| [reflection.md](docs/reflection.md)     | Self-assessment and next steps                               |
| [walkthrough.md](docs/walkthrough.md)   | Script for the 10-minute demo                                |
| [reviews/](docs/reviews/)               | Partner architecture review and code review notes            |

## Testing

`npm test` runs 71 tests. Most render the whole app (real store, router and HTTP client) at a URL
against the same MSW handlers the browser uses, and interact by role and label the way a user
would. See [decisions.md → D4-5](docs/decisions.md#d4-5-testing) for what's covered.

## Continuous integration

Every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): format check, lint,
typecheck, tests and a production build. Pushes to `main` also deploy to GitHub Pages
([`deploy.yml`](.github/workflows/deploy.yml)).

### Branch protection (one-time setup, repo admin)

The workflow reports pass or fail. To make a failing check **block the merge**:

1. GitHub → **Settings → Branches → Add branch ruleset** (or "Add rule") for `main`.
2. Turn on **Require status checks to pass before merging** and select
   **Lint, typecheck, test, build**.
3. Turn on **Require a pull request before merging**.

For the deploy: **Settings → Pages → Source: GitHub Actions**.

## Troubleshooting

- **Blank page or API 404s in dev:** the mock service worker may be stale. Hard-reload, or in
  DevTools → Application → Service Workers, unregister it and reload.
- **Weird data after experimenting:** Mock controls → **Reset everything** (clears mock stock,
  orders, sessions and chaos settings).
