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

## D3-3 Auth

- **Used:** a `session` slice, RTK Query `login` and `getMe` endpoints, a `<RequireAuth>` route
  wrapper, and the client's `onUnauthorized` hook for global 401 handling. Full write-up, including
  token storage and its trade-off, in [auth.md](auth.md).
- **Considered:** redirecting from inside the HTTP client (`window.location = '/login'`). That
  reloads the page and loses in-memory state. Clearing the session in Redux and letting
  `<RequireAuth>` react keeps the redirect declarative and the "where you were" state intact.

## D3-2 Cart

- **Quantities can't exceed stock:** enforced in the reducers (`itemAdded`, `quantityChanged`
  clamp to `line.stock`), not only by the input's `max`, because `max` doesn't stop typed or pasted
  values. Stock limits stay current: fresh product data (`getProduct` fulfilled), a 409, and live
  stock updates all dispatch `stockUpdated`, which lowers the quantity and tells the user why.
- **Survives reload:** the cart is saved to localStorage by listener middleware and validated on
  load (D3-1).
- **409 names the item:** the API returns `details.productId` and `available`. The checkout uses
  the name from the user's own cart line and lowers that line to what's available.
- **No duplicate orders, two layers:**
  1. _Client:_ the button is disabled while the request runs, and a ref rejects re-entry from a
     double click.
  2. _Server (the real guarantee):_ an **idempotency key**. The first "Place order" click creates a
     UUID (`checkoutKeyIssued`), stored in the cart slice (so it survives a reload) and sent as the
     `Idempotency-Key` header. A retry of the same cart reuses it, and the server returns the order
     it already created for that key. Changing the cart clears the key, because it's a different
     order. A test covers the worst case: the server saves the order but the response is lost (500),
     the user clicks **Try again**, and stock is only decremented once.
- **Considered:** disabling the button alone. That doesn't cover the lost-response case, a second
  tab or a reload mid-request, and only a server-side key handles those.

## D3-4 Backend errors

- **One pipeline:** `fetch` → `request()` → `fromHttpResponse()` → a typed `AppError` → the UI.
  Every error passes through the same three functions in `src/api/errors.ts` and
  `src/api/client.ts`.

  | Status | `AppError.kind`                    | What the user sees                                                     |
  | ------ | ---------------------------------- | ---------------------------------------------------------------------- |
  | 400    | `validation` (field → code)        | Message under each field, `aria-invalid`, focus on the first bad field |
  | 401    | `unauthorized`                     | Session cleared, redirect to sign in with "Your session expired"       |
  | 401    | `invalid-credentials` (login only) | "That email and password do not match."                                |
  | 404    | `not-found`                        | The Not Found page                                                     |
  | 409    | `out-of-stock`                     | Names the item, lowers its quantity, links to the cart                 |
  | 500    | `server`                           | "Something went wrong" with **Try again**                              |
  | none   | `network`                          | "You seem to be offline" with **Try again**                            |

- **Raw messages can't reach the screen, by construction:** `AppError` has **no `message`
  field**. The server's `error.message` is dropped in `fromHttpResponse()`, and all copy comes from
  `describeError()` and `fieldMessage()`. Field details arrive as codes (`invalid_email`) that we
  translate, and unknown codes fall back to a generic sentence. A test feeds a SQL error string
  through every status and checks it never appears.
- **Triggering on purpose:** the **Mock controls** panel (bug button, bottom right) can force any
  endpoint to return any of its documented errors.
- **Considered:** a global toast for every error. Toasts are easy to miss and hard for screen
  readers to reach. Errors belong next to what failed: the form field, the list, the checkout
  button.

## D3-5 Caching

- **Used:** RTK Query's normalized-by-argument cache with tags.
  - **Reuse:** each query is cached by its arguments. Revisiting a product, or going Back to a
    search, renders straight from the cache with no request and no spinner (both tested). Unused
    entries stay for `keepUnusedDataFor`: **300 s** for product details, **120 s** for list pages.
  - **Refresh after an order:** `createOrder` invalidates `ProductList` plus a
    `{ type: 'Product', id }` tag for each ordered product. A 409 invalidates the product that ran
    out. Anything on screen refetches at once, and anything off screen refetches next time it's
    shown. A test orders 1 of 10 and checks that the product page then shows 9.
  - **Background freshness:** `refetchOnReconnect`, plus live stock updates (D4-4) patching the
    cache as stock changes.
- **When stale data is acceptable, and when it isn't:**

  | Data                       | Stale OK?    | Why                                                                                                    |
  | -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
  | Name, price, image, rating | Yes, minutes | Rarely changes. A slightly old rating harms no one.                                                    |
  | Stock on the grid          | Yes, briefly | It's a hint, and live updates narrow the gap.                                                          |
  | Stock **at checkout**      | **No**       | The server is the authority. It re-checks every line and answers 409, so a stale cache can't oversell. |
  | Price **at checkout**      | No           | A real server would re-price the order. We'd show a "price changed" step.                              |
  | Order status               | No           | Polled every 1.5 s until confirmed.                                                                    |
  | The signed-in user (`/me`) | No           | `refetchOnMountOrArgChange` on the account page; this is how an expired token shows up.                |

  The rule I use: cached data can be stale wherever being wrong only costs a moment's confusion.
  Anything that moves money or stock is validated by the server at the moment of the write.

- **Considered:** TanStack Query (very similar, but RTK Query is already in the store for D3-1),
  and hand-rolled caching in a slice (it would mean re-implementing de-duplication, expiry and
  invalidation).

## D4-4 WebSockets (live stock)

- **Used:** a real `WebSocket` in the browser (`src/api/stockFeed.ts`), answered by MSW's
  WebSocket interception (`ws.link` in `src/mocks/stockSocket.ts`). The client subscribes to the
  product ids it is showing, and the server pushes `{ type: 'stock', productId, stock }` when
  stock changes.
- **Updating the UI:** `stockChanged()` patches every cached copy of the product with
  `updateQueryData` (its details entry and any list page containing it) and updates the cart's
  quantity limit. There is no refetch, and the page re-renders from the cache.
- **Recovers after a disconnect:** an unexpected `close` schedules a reconnect with exponential
  backoff and jitter (1 s, 2 s, 4 s … up to 15 s), and the subscription is re-sent on reconnect. The
  `online` event skips the wait. A status pill shows Live, Reconnecting or Paused (`role="status"`,
  so screen readers hear it). Try it: Mock controls → **Drop live connection**.
- **Stops when the page closes:** `useStockFeed` closes the socket and cancels any pending
  reconnect timer on unmount and on `pagehide`, and reopens on `pageshow` from the back/forward
  cache. The mock server stops its ticker when no clients are left. Tests cover all three
  behaviours (live update, reconnect plus re-subscribe, close on leaving the page).
- **Considered:**
  - **Polling** `GET /api/products/:id` every few seconds: simplest and works through any proxy,
    but it is wasteful (most polls return nothing new) and always late by up to one interval.
    Good enough for the order status page, where I did use polling.
  - **Server-Sent Events:** one-way server → client over plain HTTP, with automatic reconnect built
    in. A very good fit for stock, which only flows one way. I'd pick SSE in production if the
    backend offered it. I picked WebSockets because the brief names them, and because the
    client → server `subscribe` message is natural on a two-way channel.
  - **How WebSockets work:** the client sends an HTTP `GET` with `Upgrade: websocket`, the server
    answers `101 Switching Protocols`, and the same TCP connection becomes a full-duplex message
    channel with no per-message HTTP headers. You have to handle reconnects, heartbeats and
    backpressure yourself, and load balancers need sticky or long-lived connection support.

## D4-2 Performance

- **Measured first, in a production build:** Chrome long tasks plus DOM size while 3,000 products
  receive live stock updates, and a Node timing harness for the list endpoint. Numbers, method and
  caveats are in [performance.md](performance.md).
- **The two slowest spots, both fixed:** (1) each live stock update re-rendered all loaded cards
  (130 ms median long task → none), and (2) each list request sorted 5,000 products on the main
  thread (name sort 29.7 ms → 0.12 ms median).
- **Considered:** optimizing by guesswork (adding `useMemo` everywhere). Measuring showed the cost
  was in two specific places, and showed that flattening pages, the obvious candidate, costs 0.065 ms.

## D4-3 Memoization and virtualization

- **Used:** `@tanstack/react-virtual` with window scrolling for the product grid, `React.memo`
  on `ProductCard`, and infinite loading when the rendered window is near the end. The full
  justification table, including what I skipped or removed and why, is in
  [performance.md](performance.md#d4-3-memoization-and-virtualization-justified).
- **Accessibility kept:** virtualization removes off-screen cards from the DOM, which would break
  Tab navigation (Tab would fall off the last rendered card). The grid uses `role="grid"` with a
  roving tabindex: one Tab stop, and arrow keys, Home and End scroll the target row into view
  before focusing it. Tests cover this.
- **Considered:** `react-window` (fixed row heights, older API), CSS `content-visibility: auto`
  (cuts paint cost but keeps all 3,000 cards in the DOM and in React's render), and pagination
  with page numbers (simplest, but the brief asks for a smooth 5,000-item list).

## D4-7 Monitoring

- **Used:** a hand-written `ErrorBoundary` class (React only offers boundaries as class
  components) at three levels (page, route, root), global `error` and `unhandledrejection`
  handlers, an RTK middleware that logs 5xx and network API failures, and one `logError()`
  function that everything goes through. Details and the three metrics I'd track are in
  [monitoring.md](monitoring.md).
- **Considered:** `react-error-boundary` (nice API, but it's about 30 lines to write and explain
  myself) and Sentry (the right choice for a real launch, but it needs an account and a DSN, and
  `logError` is shaped so swapping it in is a one-file change).

## D4-1 Accessibility

- **Result:** Lighthouse accessibility **100** on home, cart and login (production build,
  `npm run a11y`). The first run scored 95 / 100 / 100 and found three real issues, now fixed:
  `aria-label` on a plain `<span>` (the rating), a heading jump from `<h1>` to card `<h3>`s, and
  the cart link's label not containing its visible text (which breaks voice control).
- **Keyboard:** skip link, visible focus ring everywhere (`:focus-visible`, 3 px amber), focus
  moves to the page `<h1>` after navigation, the product grid is one Tab stop with arrow-key
  navigation (D4-3), Back to Top also moves focus, and every control is a real `<button>`,
  `<a>` or form element.
- **Screen readers:** form errors are announced (a `role="alert"` region plus
  `aria-invalid`/`aria-describedby` on each field, and focus moves to the first invalid field),
  loading and result counts use `role="status"`, ratings and the cart badge have hidden text, and
  decorative images and emoji are `alt=""` / `aria-hidden`.
- **Also:** `prefers-reduced-motion` turns off animations and smooth scrolling, the colors pass
  WCAG AA contrast, and touch targets are at least 44 px.
- **Considered:** `eslint-plugin-jsx-a11y` (oxlint's `jsx-a11y` plugin already runs on every lint)
  and axe in the unit tests (useful, but Lighthouse runs axe-core against the real built page, which
  catches things jsdom can't, like contrast).
