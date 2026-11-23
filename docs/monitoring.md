# Monitoring

## What happens when something breaks

| Failure                            | Caught by                                                 | User sees                                                                    | Logged as                              |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| Error while rendering a page       | `<ErrorBoundary>` around the page (`src/app/Layout.tsx`)  | "Something broke on this page" with Try again. Header and cart keep working. | `render`, with React's component stack |
| Error in the layout or router      | Route `errorElement` → `RouteErrorFallback`               | The same fallback screen                                                     | `render`                               |
| Error before the router renders    | Outer `<ErrorBoundary>` in `src/main.tsx`                 | The same fallback screen                                                     | `render`                               |
| Error in an event handler or timer | `window` `error` listener (`installGlobalErrorHandlers`)  | Nothing changes: the UI didn't crash                                         | `window`                               |
| Rejected promise nobody handled    | `window` `unhandledrejection` listener                    | Nothing changes                                                              | `promise`                              |
| API 5xx or network failure         | `apiErrorLogger` middleware (`src/app/apiErrorLogger.ts`) | The page's own error state with retry                                        | `api`, with the endpoint name          |

Expected API outcomes (400, 401, 404, 409) are normal app flow handled in the UI, so they are
**not** logged as errors. Otherwise the logs would fill with noise and real problems would get
lost.

The crashed page resets when you navigate (`resetKey={pathname}`), so one broken page doesn't
break the rest of the session.

**Try it:** Mock controls → **Throw a render error**. The fallback appears and the console shows
`[bug-bazaar] render error: Error: Test crash from Mock controls` with the component stack.
`src/components/monitoring.test.tsx` checks both behaviours.

## The logger

`src/lib/logger.ts` is the one function the app calls: `logError(error, source, extra)`. It:

- writes a structured entry (message, stack, component stack, source, URL, time) to the console,
- keeps the last 50 entries in memory (`recentLogs()`), useful for attaching to a bug report,
- sends the entry with `navigator.sendBeacon` to `VITE_LOG_ENDPOINT` if one is set. `sendBeacon`
  still delivers while the page is unloading, which is when a lot of crashes get reported.

In production I'd replace the body of `logError` with Sentry (or Datadog RUM), add source maps so
stacks point at real code, and add release and user tags. Nothing else in the app would change.

## Three things I'd track

1. **Checkout success rate and its failure reasons.** Of the users who press "Place order", what
   share reach the confirmation page, split by failure (`409 out-of-stock`, `500`, `network`,
   `401` mid-checkout). This is the money path. A rising 409 share means stock data shown to
   users is too stale; a rising 500 share means a backend incident. **Alert** if the success rate
   drops more than 5 points below its 7-day baseline over 15 minutes.
2. **Frontend error rate per session, by release.** The share of sessions with at least one
   `render`, `window` or `promise` error, grouped by message and app version. A spike right after
   a deploy is the fastest regression signal there is, and grouping shows which bug to fix first.
   **Alert** on a new error group affecting more than 1% of sessions.
3. **Real-user performance on the product list: INP and long tasks.** Interaction to Next Paint
   (p75) and long-task count per session, measured with the `web-vitals` library and the same
   `PerformanceObserver` used in `docs/performance.md`, split by device class. The list is where
   5,000 items and live updates can make the UI janky, and lab measurements on a fast laptop hide
   what users on low-end phones feel. **Target:** INP p75 under 200 ms.

Close runners-up: API latency p95 per endpoint (`/api/products` especially), and live stock
socket reconnects per session (a spike means an infrastructure or proxy problem).
