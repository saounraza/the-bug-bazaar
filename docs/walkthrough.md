# 10-minute walkthrough

A suggested running order for D5-9. Open Mock controls first and set latency to about 400 ms so the
loading states are visible.

## 1. Full shopping flow (about 5 min)

1. **Shop:** type "duck" in search (one request after typing stops, URL becomes `?q=duck`),
   pick **Rubber ducks**, tick **In stock only**, sort **Price: low to high**. Copy the URL into a
   new tab and the same view appears. Press **Back** twice to step back through the filters.
2. **Grid:** scroll down so more pages load on their own, press Tab once into the grid and use the
   arrow keys, then press Enter on a product. Point out the **Live stock** pill: the number changes
   without a refresh.
3. **Details:** click **Next product →** several times fast and the right product always shows.
   Set quantity 2, **Add to cart**, and the header badge updates (a derived value).
4. **Cart:** try typing 99 in the quantity: it's capped at stock. Reload the page and the cart
   is still there.
5. **Checkout:** you're sent to sign in. Use the demo account and you're returned to checkout.
   Place the order and the confirmation page moves queued → processing → confirmed.

## 2. Errors on purpose (about 1.5 min)

- Mock controls → `POST /api/orders` → **409**, place an order, and the message names the item.
- **Orders: save, then fail with 500**: place an order, see "Something went wrong", untick it,
  click **Try again**, and you get the same order (stock only dropped once). That's idempotency.
- **Expire all sessions**, open Account, and you're signed out and sent to sign in.
- **Throw a render error**: the fallback screen appears, the header still works, and the error
  is in the console.

## 3. One hard bug (about 1.5 min)

**The test that passed for the wrong reason (D2-6).** I wrote a test where an old search response
arrives after the new one, and it passed. To be sure it tested the fix, I reintroduced the bug
(reading `data` instead of `currentData`), and it _still passed_. The reason: RTK Query caches each
response under its own arguments, so a late "du" response can never overwrite "duck". The real
risk was a different moment: while "duck" is loading, `data` still holds the "du" results and
shows them under the "duck" heading. I added a test for exactly that gap, confirmed it fails with
`data`, and kept both. Lesson: make a test fail before trusting it.

_(Alternative: the StrictMode abort bug in `useProductDetails`. Aborting in cleanup would cancel the
request the remounted effect needs, so the abort is deferred to a microtask and skipped if an effect
for the same id has taken over.)_

## 4. One trade-off (about 1.5 min)

**Session token in localStorage** ([auth.md](auth.md)). It survives a reload and works with a
contract that returns the token in the body, but any script on the page can read it (XSS risk).
With a real backend I'd keep a short-lived access token in memory plus a refresh token in an
`HttpOnly; Secure; SameSite` cookie. Only `getToken()` and the 401 handler would change.

_(Alternatives: filters only in the URL vs Redux, or WebSockets vs SSE for live stock.)_
