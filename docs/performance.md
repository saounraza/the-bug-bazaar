# Performance

## How I measured

| What                   | Tool                                                                                                                                                                                                           | Where the code is                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Product list in Chrome | Production build (`npm run build && npm run preview`), mock latency 0, a console script that loads 3,000 products, then records **long tasks** (`PerformanceObserver`, > 50 ms) for 12 s of live stock updates | [`perf/browser-list.js`](../perf/browser-list.js)                             |
| API handler cost       | 200 timed runs per case after a 20-run warm-up, median and p95                                                                                                                                                 | [`perf/queryProducts.perf.ts`](../perf/queryProducts.perf.ts), `npm run perf` |

Machine: Windows 11 development laptop, Chrome (desktop), Node 24. Absolute numbers will differ on
other machines. The before/after ratio is what matters, and both runs used the same script and
setup.

**Caveats I want to be upfront about:**

- My first attempt measured frame times with `requestAnimationFrame`. One frame came out at 85 s,
  which means the tab was throttled in the background, so I discarded those numbers and switched
  to long tasks and DOM counts, which don't depend on rAF.
- Event Timing (click → next paint) came back empty because the script's synthetic `.click()`
  events aren't trusted, so I don't report click latency.
- Both runs started visible and ended with the tab hidden (my editor took focus). Long-task
  durations measure CPU work either way, and both runs had the same conditions.
- Total time to load 3,000 products isn't comparable: the "before" grid loaded on a button click,
  the "after" grid loads as you scroll.

## D4-2: the two slowest spots

### 1. Every live stock update re-rendered the whole list

With 3,000 products loaded, the grid rendered **3,000 cards (33,129 DOM nodes)**. A single stock
change patches one product in the RTK Query cache, but the list page re-renders, and with
un-memoized cards React re-renders and diffs all 3,000. Each tick froze the main thread for over
100 ms.

**Fix:** virtualize the grid (only rows near the viewport are in the DOM) and wrap `ProductCard` in
`React.memo` (see D4-3).

| Metric (3,000 products loaded, 12 s of live updates) | Before | After  |
| ---------------------------------------------------- | ------ | ------ |
| Cards in the DOM                                     | 3,000  | 40     |
| DOM nodes on the page                                | 33,129 | 580    |
| Long tasks during live updates                       | 5      | **0**  |
| Median long task                                     | 130 ms | (none) |
| Worst long task                                      | 158 ms | (none) |

### 2. Every product-list request sorted 5,000 products on the main thread

MSW handlers run on the page's main thread, so the "server" time for `GET /api/products` blocks
rendering and input just like app code. Sorting by name called `localeCompare` about 60,000 times
per request, and every request lower-cased every product name again for search.

**Fix:** name, price, rating and id never change, so each sort order is computed **once** and
cached as a list of ids. Names are lower-cased once at startup. A request now only filters an
already-sorted list ([`src/mocks/db.ts`](../src/mocks/db.ts)).

| `queryProducts` case           | Before median | Before p95   | After median | After p95   |
| ------------------------------ | ------------- | ------------ | ------------ | ----------- |
| Default list (featured)        | 2.04 ms       | 3.09 ms      | 0.11 ms      | 0.20 ms     |
| Search "duck"                  | 1.78 ms       | 2.43 ms      | 0.30 ms      | 0.80 ms     |
| **Sort by name A to Z**        | **29.71 ms**  | **55.46 ms** | **0.12 ms**  | **0.41 ms** |
| Search + category + price sort | 1.47 ms       | 2.48 ms      | 0.40 ms      | 1.12 ms     |

A 30 to 55 ms block is two to three dropped frames on every name-sorted request. It now fits easily
inside one frame. This would be a backend fix in a real app (a database index does the same job),
but the profiling lesson is the same: find what you recompute on every request but could compute
once.

## D4-3: memoization and virtualization, justified

| Optimization                                                       | Kept?       | Why                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Virtualized grid** (`@tanstack/react-virtual`, window scrolling) | Yes         | The biggest win above: DOM size stays constant (about 40 cards) however many products are loaded. Window scrolling (not an inner scroll box) keeps native page scroll, Back to Top and scroll restoration.                                                          |
| **`React.memo(ProductCard)`**                                      | Yes         | Immer's structural sharing means a stock patch replaces only one product object, so memo skips every other card. Its props are plain values (the product object, a string, a number), so the shallow compare is cheap and reliable.                                 |
| **Live stock subscribed to visible ids only**                      | Yes         | The grid reports which products are rendered. The socket subscribes only to those, so the server never pushes updates for off-screen products. Less traffic, fewer cache patches.                                                                                   |
| **`useCallback` for `loadMore`**                                   | Yes         | It's a dependency of the grid's "near the end" effect. A new function every render would re-run that effect for no reason.                                                                                                                                          |
| **Roving tabindex**                                                | Yes         | Not speed, but it is what makes virtualization accessible: one Tab stop for the grid, and arrow keys scroll unrendered rows into view, so cards that don't exist in the DOM yet are still reachable.                                                                |
| `loading="lazy"` + fixed `width`/`height` on images                | Yes         | Off-screen images aren't fetched, and fixed dimensions prevent layout shift as they load.                                                                                                                                                                           |
| `useMemo` around `data.pages.flatMap(...)`                         | **Skipped** | I measured it: flattening 50 pages (3,000 items) takes **0.065 ms** median (0.17 ms p95). That's far below anything noticeable, and the grid isn't memoized, so a stable array reference wouldn't save a render anyway. `useMemo` would add complexity for no gain. |
| `React.memo` on `Price`, `Rating`, `StockBadge`                    | **Skipped** | They only render inside an already-memoized card, so they re-render only when that card does, which is when its data changed.                                                                                                                                       |
| "Load more" button                                                 | **Removed** | Replaced by loading the next page when the rendered window is 3 rows from the end. A loading status is announced via `role="status"`.                                                                                                                               |
| Moving the mock API into a Web Worker                              | **Skipped** | After fix 2 the handler costs under 1.2 ms at p95. A worker would add messaging complexity to save time nobody can perceive.                                                                                                                                        |
| React Compiler (automatic memoization)                             | **Skipped** | The manual memoization above is small and explainable, and the compiler would also skip the virtualizer hook (it flags `useWindowVirtualizer` as incompatible).                                                                                                     |

## How to re-run

```bash
npm run perf                              # handler timings in Node
npm run build && npm run preview          # then open http://localhost:4173/
# Mock controls → latency 0, then paste perf/browser-list.js into the console
# and read window.__perf once status is "done" (about 40 s).
```
