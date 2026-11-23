# Reflection

> **To the author:** the ratings are _your_ self-assessment, so the score column is left for you.
> Rate how well you could explain and rebuild each topic **without AI**, not how complete the
> code is. The evidence column points at where each topic lives, so you can check yourself before
> scoring. Replace the `_` with a number and add a sentence in your own words where the score is
> below 7.

## Ratings by topic

| Topic                        | Task | Score (/10) | Evidence in this repo                                                                |
| ---------------------------- | ---- | ----------- | ------------------------------------------------------------------------------------ |
| Setup                        | D1-1 | _           | README quick start, oxlint + Prettier, `.env.example`                                |
| HTTP and API contracts       | D1-2 | _           | `docs/api-contract.md`, `src/mocks/handlers.ts`, `contract.test.ts`                  |
| TypeScript                   | D1-3 | _           | strict + `noUncheckedIndexedAccess`, `RequestState`/`AppError`/`SessionState` unions |
| Data layer                   | D1-4 | _           | `src/api/client.ts`, `baseApi.ts`, lint rule banning `fetch` elsewhere               |
| Product list                 | D2-1 | _           | `ProductCard`, details page, `formatPrice`                                           |
| Filters                      | D2-2 | _           | `useProductFilters` (URL as the only source), `filters.test.tsx`                     |
| UI states                    | D2-3 | _           | `AsyncView`, `toRequestState`, `uiStates.test.tsx`                                   |
| useEffect and cleanup        | D2-4 | _           | `useProductDetails` (abort + StrictMode microtask), `BackToTop`                      |
| Custom hooks                 | D2-5 | _           | `src/hooks/*`, `hooks.test.ts`                                                       |
| Race conditions              | D2-6 | _           | keyed cache + `currentData`, `raceConditions.test.tsx` (and the mutation check)      |
| Redux Toolkit                | D3-1 | _           | `cartSlice`, `sessionSlice`, `createSelector`, listener middleware                   |
| Cart                         | D3-2 | _           | clamp in reducers, idempotency key, `checkout.test.tsx`                              |
| Auth                         | D3-3 | _           | `RequireAuth`, `onUnauthorized`, `docs/auth.md`                                      |
| Backend errors               | D3-4 | _           | `fromHttpResponse`, `describeError` (no raw messages by construction)                |
| Caching                      | D3-5 | _           | tags + `keepUnusedDataFor`, stale-data table in `decisions.md`                       |
| Accessibility                | D4-1 | _           | Lighthouse 100 ×3, roving tabindex grid, announced form errors                       |
| Performance                  | D4-2 | _           | `docs/performance.md` before/after numbers                                           |
| Memoization / virtualization | D4-3 | _           | `VirtualProductGrid`, `memo(ProductCard)`, skipped-optimization table                |
| WebSockets                   | D4-4 | _           | `stockFeed.ts` (backoff, re-subscribe), `stockSocket.ts`, `liveStock.test.tsx`       |
| Testing                      | D4-5 | _           | 71 behaviour tests, MSW in Node                                                      |
| Git / CI / CD                | D4-6 | _           | `.github/workflows/ci.yml`, `deploy.yml`, one commit per task                        |
| Monitoring                   | D4-7 | _           | `ErrorBoundary`, `logger.ts`, `docs/monitoring.md`                                   |
| Architecture                 | D5-1 | _           | `docs/ARCHITECTURE.md`                                                               |
| Design patterns              | D5-2 | _           | adapter, container/presentational, custom hooks                                      |
| Queues / microservices       | D5-3 | _           | `docs/orders.md`                                                                     |
| Architecture vocabulary      | D5-4 | _           | `docs/glossary.md`                                                                   |
| Architecture review          | D5-5 | _           | `docs/reviews/architecture-review.md`                                                |
| Code review                  | D5-6 | _           | PR comments, `docs/reviews/code-review.md`                                           |
| AI workflow                  | D5-7 | _           | `docs/ai-notes.md`                                                                   |
| Assessment                   | D5-8 | _           | this file                                                                            |
| Submission                   | D5-9 | _           | PR, CI, README, walkthrough                                                          |

## Two gaps, each with one specific next step

### Gap 1: Nothing tests the app in a real browser on every change

All 71 tests run in jsdom against MSW. They can't see layout, real scrolling, the service worker,
or virtualization with real element heights. jsdom reports every element as 0 px tall, which once
made the virtual grid render everything and load all pages. That bug was only visible because a
test timed out. The accessibility and performance checks ran in real Chrome, but by hand.

**Next step:** add **one Playwright test** that runs in CI against `vite preview`: open the shop,
scroll the grid until page 2 loads, open a product with the keyboard, add it to the cart, sign in,
and place an order, all in headless Chromium. Then add `npm run a11y` (the Lighthouse script) to the
same job, so the score of 90+ is enforced, not just measured once.

### Gap 2: "A failing test blocks the merge" is configured on paper, not proven

The CI workflow exists and passes locally step by step, but branch protection is a GitHub setting
that isn't in the repo, and nobody has watched a red check block a merge yet.

**Next step:** after pushing, enable the `main` ruleset as described in the README. Then open a
throwaway PR that breaks one test (for example change `toBe(3)` to `toBe(4)` in
`cartSlice.test.ts`), take a screenshot of the disabled merge button, link it in the PR description,
and close the PR.

> <Optional: replace or add gaps you noticed yourself, for example a topic you scored below 6.>
