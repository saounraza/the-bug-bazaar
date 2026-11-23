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

## D2-1 Product list

- **Used:** React Router 8 (data router, so `<ScrollRestoration>` works), an RTK Query
  **infinite query** for the list (pages of 60), and a details page at `/products/:id`.
- **Prices:** stored and summed as integer cents. `formatPrice()` in `src/lib/money.ts` is the only
  place that divides by 100, using `Intl.NumberFormat`. It throws on non-integers, so a float that
  slips in fails loudly instead of showing `$24.990000001`.
- **Keyboard:** each card has exactly one link (the product name) and a `::after` overlay makes the
  whole card clickable. Tab moves card to card, Enter opens, and `:focus-within` draws a visible
  ring around the whole card. After navigation, focus moves to the new page's `<h1>`.
- **Considered:** wrapping the whole card in `<a>`. Screen readers would then read the name, price,
  rating and stock as one long link name, and nested interactive content would be invalid.

## D2-3 UI states

- **Used:** `toRequestState()` (`src/lib/queryState.ts`) turns an RTK Query result into the
  `RequestState` union, and one `<AsyncView>` component (`src/components/AsyncView.tsx`) renders
  each state the same way on every page: a skeleton plus a `role="status"` announcement while
  loading, an `EmptyState`, an `ErrorState` (`role="alert"`) with a **Try again** button that calls
  `refetch()`, or the content. A 404 renders the Not Found page instead.
- **How to trigger each state:** loading (Mock controls → latency 3000 ms), empty (search
  `zzz`), error (force `GET /api/products` → 500), not found (`/products/nope`).
- **Considered:** letting each page check `isLoading`/`isError` itself. That is how pages drift
  apart: one forgets the retry button, another shows a blank screen on error. A `switch` over the
  union means TypeScript complains if a state is left out.
- `role="status"` over `<output>`: `<output>` is meant for the result of a calculation in a form,
  so I turned off oxlint's `prefer-tag-over-role` rule.

## D2-5 Custom hooks

| Hook                                       | Replaces                                                                                     | Used by                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `useDebouncedValue(value, ms)`             | A `setTimeout`/`clearTimeout` pair in every input that waits for typing to stop              | Search box                                                |
| `useEventListener(type, handler, target?)` | `addEventListener` + matching `removeEventListener` in an effect, with a ref for the handler | Back to Top, stock feed (`online`, `pagehide`), grid keys |
| `useDocumentTitle(title)`                  | `document.title = ...` copied into each page                                                 | Every page                                                |
| `useProductFilters()` (D2-2)               | Parsing and writing filter params in the URL                                                 | Product list and filter bar                               |

- **Typed:** generics carry the value type through (`useDebouncedValue<T>`), and
  `useEventListener<K extends keyof WindowEventMap>` gives the handler the right event type
  (`'scroll'` → `Event`, `'keydown'` → `KeyboardEvent`).
- **Why a ref in `useEventListener`:** callers pass inline functions. Without the ref, the
  listener would be removed and re-added on every render, or would hold a stale closure.
- **Considered:** `usehooks-ts`. These hooks are a few lines each, and writing them is the point of
  the exercise. Each one has tests in `src/hooks/hooks.test.ts`.

## D2-2 Filters

- **Used:** the URL query string as the **only** copy of the filters (`?q=&category=&sort=&inStock=1`),
  read and written through `useProductFilters()`. The parsed filters object is the RTK Query
  argument, so each distinct URL has its own cache entry.
- **Refresh, shared link, Back:** all three work because nothing else holds filter state. Parsing
  validates every value (`isCategory`, `isSortOption`), so a hand-edited URL like `?sort=lol` falls
  back to the default instead of crashing. Defaults are left out of the URL, so the plain shop URL
  stays `/`.
- **History:** dropdowns and the checkbox push a history entry, so Back undoes them one at a time.
  The search box pushes once when a search starts, then _replaces_ while you refine it. Otherwise
  typing "keyboard" would leave 8 Back-button stops.
- **Considered:** Redux or `useState` for filters, synced to the URL with an effect. That gives
  two sources of truth and sync bugs (Back changes the URL but not the state). Keeping only the URL
  avoids the whole class.

## D2-4 useEffect and cleanup

- **Used:** `useProductDetails(id)` subscribes to the product with
  `dispatch(getProduct.initiate(id))` in an effect. Its cleanup **unsubscribes and aborts** the
  request if it is still running. RTK Query passes an `AbortSignal` through our `baseQuery` into
  `fetch`, so the browser really cancels the HTTP request (a test checks this). The page reads
  `currentData`, which only ever holds data for the current `id`, so a late response for an old
  product is cached under its own id and never shown.
- **StrictMode gotcha:** in development React mounts, unmounts and remounts every effect. Aborting
  straight away in cleanup would cancel the request the remounted effect is waiting on, and the
  page would get stuck on an aborted request. The abort is deferred to a microtask and skipped when an effect for
  the same id has taken over. Real switches and unmounts still abort. I logged this in
  `ai-notes.md`.
- **Listeners and timers:** Back to Top uses `useEventListener('scroll', …, { passive: true })`,
  which removes the listener on unmount (also tested). The debounce timer, the order-status polling
  and the live stock socket all stop in their own cleanup.
- **Considered:** the classic `let ignore = true` flag in `useEffect`. It stops a stale response
  from being _shown_, but the request still runs to completion. `AbortController` actually cancels
  it, and the cache keyed by id makes the "ignore" part automatic.

## D2-6 Race conditions

- **Simulating it:** Mock controls → "Random search latency" adds 0 to 2000 ms to every product
  list response, so an older query can finish after a newer one. The test
  `raceConditions.test.tsx` makes it deterministic: "du" takes 800 ms and "duck" takes 50 ms.
- **What prevents wrong results, in three layers:**
  1. **Cache keyed by query.** RTK Query stores each response under the exact arguments that
     produced it. A late "du" response lands in the "du" entry, and the page only reads the entry
     for the current URL, so the order responses arrive in can't matter.
  2. **`currentData`, not `data`.** While "duck" is loading, `data` would still hold the "du" items,
     shown under a "results for duck" heading. `currentData` is `undefined` until the current
     query's own response arrives, so the page shows a skeleton instead.
  3. **Debouncing** (300 ms) means fast typing sends one request, not one per keystroke. That
     reduces load, but it is _not_ the fix on its own: a pause mid-word still sends two requests.
- **Proving the tests test something:** I swapped `currentData` for `data` and re-ran. The
  out-of-order test still passed (layer 1 covers it) but the loading test failed. That told me
  which mechanism each test actually guards, so I kept both.
- **Considered:** aborting the previous search with `AbortController`, as the details page does.
  It saves bandwidth, but the old response is already harmless here, and keeping it cached makes
  Back to a previous search instant. A hand-rolled version would use a request counter
  (`if (id !== latestId) return`) or an abort, and both are explained in `glossary.md`.

## D3-1 Redux Toolkit

- **Used:** two slices, `cart` and `session`, next to RTK Query's `api` slice in one store. State
  only changes through the slice actions (`itemAdded`, `quantityChanged`, `itemRemoved`,
  `stockUpdated`, `checkoutKeyIssued`, `cartCleared`, `loggedIn`, `loggedOut`, `sessionExpired`).
  Immer lets reducers read as mutations while staying immutable.
- **Derived values:** `selectCartCount` and `selectCartTotal` are memoized `createSelector`s over
  `lines`. The header badge reads `selectCartCount`. The count is never stored, so it can't drift
  from the lines.
- **Side effects outside reducers:** a listener middleware saves `cart` and `session` to
  localStorage whenever they change. The random checkout key is created in a `prepare` callback.
  Reducers stay pure and deterministic, which keeps them easy to test.
- **Session as a union:** `{ status: 'anonymous', notice } | { status: 'authenticated', token, user }`.
  "Token but no user" is impossible to represent.
- **Considered:** Zustand or React Context. Context re-renders every consumer on any change, and
  Zustand would be fine, but the brief asks for RTK, and RTK Query shares the same store and
  DevTools timeline, so cart actions and API calls show up in one place.
