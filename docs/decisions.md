# Decisions

One entry per task: what I used, what else I considered, and why.

## D1-1 Setup

- **Used:** Vite 8, npm with a committed lockfile (`npm ci`), oxlint for linting, Prettier for
  formatting, `.editorconfig` and `.gitattributes` (LF line endings, so Windows and macOS diffs
  match).
- **Considered:** ESLint with typescript-eslint. It has more rules, but oxlint already covers the
  ones this project needs (`no-explicit-any`, `ban-ts-comment`, React hooks rules, jsx-a11y) and
  runs in milliseconds. That matters because lint runs on every pull request.
- **Why:** "Clone and run in under 5 minutes" means no required setup beyond `npm ci && npm run
dev`. Every environment variable has a working default, and `.env.example` documents them.

## D1-2 HTTP and API contracts

- **Used:** [MSW (Mock Service Worker)](https://mswjs.io) 3 with a seeded generator for 5,000
  products, and a "chaos" config to force any documented error, add latency, or make responses
  arrive out of order.
- **Considered:** `json-server` (needs a second process, can't easily produce custom error shapes
  or a 409), and a fake `fetch` function swapped in at the client (no real HTTP, so the Network tab
  shows nothing and the HTTP client code never runs).
- **Why:** MSW intercepts real `fetch` calls at the network level. The app's HTTP client, headers,
  status codes and JSON parsing all run exactly as they would against a real backend, and you can
  inspect each request in DevTools. The **same handlers** run in Vitest through `msw/node`, so the
  tests exercise the real data layer too. A fixed PRNG seed keeps product ids stable across reloads.
- **Two contract extensions** (`inStock`, `pageSize`, plus the `Idempotency-Key` header) are
  optional and documented in `api-contract.md` with the reason for each.
