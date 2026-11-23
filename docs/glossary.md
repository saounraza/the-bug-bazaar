# Glossary

Six architecture terms, each with an example from The Bug Bazaar.

## Latency

**What it is:** how long you wait between asking for something and getting the answer. It isn't
the same as throughput (how much gets done per second): a road can carry lots of cars (high
throughput) and still take an hour to cross (high latency).

**In the store:** the Mock controls latency slider adds delay to every response. At 2,000 ms you can
see why the product page shows a skeleton instead of a blank screen, why the search box is
debounced (fewer round trips), and why revisiting a product feels instant: the cache answers with
zero network latency.

## Idempotency

**What it is:** doing an operation twice has the same effect as doing it once. `GET` is naturally
idempotent. "Create an order" is not, unless you design it to be.

**In the store:** `POST /api/orders` carries an `Idempotency-Key`. If the first request created the
order but the response got lost, the retry with the same key returns that same order instead of
creating a second one, so nobody is charged twice ([orders.md](orders.md)). Setting a cart quantity
to 3 is also idempotent (`quantityChanged`), while "add one more" (`itemAdded`) is not.

## Horizontal scaling

**What it is:** handling more load by adding more machines (or processes) of the same kind, rather
than buying one bigger machine (vertical scaling). It needs the app to be stateless, or the state
to be shared, so any copy can serve any request.

**In the store:** in the order design, a flash sale fills the queue and we start more payment and
inventory workers, which take jobs from the same queue. The order API can run on many servers
behind a load balancer because the session is a token, not memory on one server. The WebSocket
feed is the tricky part: each server only knows its own connections, so stock changes would be
broadcast through a shared pub/sub (for example Redis).

## CDN (Content Delivery Network)

**What it is:** a network of servers around the world that keep copies of static files close to
users, so a shopper in Karachi downloads from a nearby server instead of one in Virginia. Files are
cached by URL.

**In the store:** the production build outputs hashed files like `index-BMBRtevn.js` and the product
images. Because the hash changes whenever the content changes, a CDN (GitHub Pages is served
through one) can cache them "forever". Only `index.html` must stay short-lived, so users pick up new
deploys.

## Cache invalidation

**What it is:** deciding when a saved copy of data is no longer true and must be thrown away or
refreshed. It's famously hard because the cache doesn't know when the original changed. You
have to tell it, or let entries expire.

**In the store:** RTK Query tags. Placing an order invalidates the `Product` tags of the items
bought (plus `ProductList`), so their stock refetches instead of showing the old number. A 409
invalidates the product that ran out. Entries nobody uses expire after 120 to 300 seconds
(`keepUnusedDataFor`). Live stock pushes update the cache in place, which is invalidation by
patching rather than refetching.

## Eventual consistency

**What it is:** different parts of a system may briefly disagree, but if no new changes happen,
they all end up agreeing. You trade "always perfectly in sync" for speed and availability.

**In the store:** the grid's stock number can lag the real stock for a moment. It catches up when a
live update arrives or the cache refetches. That's acceptable on the grid, but **not** at checkout,
so the server re-checks stock on every order and answers 409 if the shopper's copy was stale. In
the queued order design, the order says `queued` and later `confirmed`. The confirmation page
polls until the parts agree.

---

Related techniques mentioned in the decisions:

- **Request counter / "latest wins":** give each request an increasing id, and when a response
  arrives, ignore it unless its id is the latest. It's the hand-rolled version of what keyed
  caching plus `currentData` do for search (D2-6).
- **AbortController:** an object whose `signal` is passed to `fetch`. Calling `abort()` cancels the
  request in the browser. Used on the details page when switching products (D2-4).
