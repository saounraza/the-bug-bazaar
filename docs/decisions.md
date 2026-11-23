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

## D1-3 TypeScript

- **Used:** TypeScript 7 in `strict` mode, plus `noUncheckedIndexedAccess` (array and record
  lookups come back as `T | undefined`) and `verbatimModuleSyntax`. The contract types in
  `src/api/types.ts` are shared by the client **and** the mock backend.
- **Impossible states:** request status is a discriminated union (`RequestState<T, E>` in
  `src/lib/requestState.ts`): `data` only exists when `status === 'success'` and `error` only when
  `status === 'error'`. Three separate booleans (`isLoading`, `isError`, `data?`) would allow
  "loading and failed with stale data" at the same time. Errors are a union too (`AppError`), so a
  `switch` on `kind` is checked for exhaustiveness.
- **Enforced:** `no-explicit-any` and `ban-ts-comment` are lint errors, and CI runs `tsc`.
- **Considered:** leaving `noUncheckedIndexedAccess` off. It costs a few `?? fallback`s, but it
  catches real bugs like `items[0].id` on an empty page.

## D1-4 Data layer

- **Used:** one HTTP client, `request()` in `src/api/client.ts`, with RTK Query on top through a
  custom `baseQuery` adapter (`src/api/baseApi.ts`). Feature folders add endpoints with
  `injectEndpoints`, and components use only the generated hooks.
- **Enforced, not just agreed:** an oxlint `no-restricted-globals` rule makes `fetch`,
  `XMLHttpRequest` and `WebSocket` lint errors everywhere except the client, the stock feed, the
  mocks and tests.
- **Considered:** plain `fetchBaseQuery`. It works, but it would create a second network path and
  its errors would be `FetchBaseQueryError` instead of our own `AppError`. With the adapter, token
  injection, 401 handling and error normalization happen in exactly one function.
- **Why one place matters:** adding a header, logging every failure or changing how a 401 is
  handled is a one-file change, and it's impossible for a component to forget a step.
