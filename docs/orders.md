# Order flow: an order service with a queue and workers

Today the mock `POST /api/orders` checks stock, decrements it and returns `queued` in one step.
This is how I'd build it for real: an **order service** that accepts the order quickly and puts
jobs on a **queue** for **payment**, **inventory** and **email** workers.

## Diagram

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser (CheckoutPage)
  participant O as Order service
  participant DB as Orders DB
  participant Q as Queue (e.g. SQS / RabbitMQ)
  participant P as Payment worker
  participant I as Inventory worker
  participant E as Email worker
  participant PSP as Payment provider

  B->>O: POST /api/orders  {items}  Idempotency-Key: K
  O->>DB: find order by (user, K)
  alt key already used
    DB-->>O: existing order
    O-->>B: 201 {id, status} (replayed, nothing new)
  else new key
    O->>DB: INSERT order (status=queued, key=K) + outbox row  [one transaction]
    O-->>B: 201 {id, status: "queued"}
    O->>Q: publish OrderPlaced {orderId}  (from the outbox)
  end
  Q->>I: OrderPlaced
  I->>DB: reserve stock (conditional UPDATE … WHERE stock >= qty)
  alt not enough stock
    I->>Q: StockFailed → order status = failed (user is told, nothing charged)
  else reserved
    I->>Q: StockReserved
    Q->>P: StockReserved
    P->>PSP: charge(amount, idempotency_key = orderId)
    PSP-->>P: ok (or the same result again on a retry)
    P->>DB: status = confirmed
    P->>Q: PaymentSucceeded
    Q->>E: PaymentSucceeded
    E->>E: send receipt (retries with backoff; DLQ after N failures)
  end
  loop every 1.5 s until confirmed or failed
    B->>O: GET /api/orders/:id
    O-->>B: {id, status}
  end
```

Plain-text version of the same flow:

```
Browser ──POST /orders (Idempotency-Key)──▶ Order service ──tx: order + outbox──▶ DB
   ▲                                              │
   │  201 {id, queued}  (fast, before any work)   └──OrderPlaced──▶ [ QUEUE ]
   │                                                                  │
   └──── polls GET /orders/:id ◀── status in DB ◀──┐                  ├─▶ Inventory worker ─ reserve stock
                                                   │                  ├─▶ Payment worker ─── charge (key = orderId)
                                                   └──────────────────┤
                                                                      └─▶ Email worker ───── receipt (retry, DLQ)
```

## Why a queue helps

- **Fast, reliable checkout.** The user gets `201 queued` as soon as the order is safely stored,
  in milliseconds, instead of waiting on a payment provider, a stock reservation and an email
  server in sequence. The confirmation page polls for the final status (this app already does:
  `OrderPage` polls `GET /api/orders/:id`).
- **Failures stay contained.** Each worker can fail and retry on its own. A slow email server
  doesn't slow down payments, and a payment provider outage doesn't lose orders: the jobs wait in
  the queue and are processed when it recovers.
- **Retries for free.** If a worker crashes mid-job, the message isn't acknowledged, so the queue
  delivers it again. That's at-least-once delivery, which is why every worker must be idempotent
  (below).
- **Absorbs spikes and scales out.** A flash sale fills the queue instead of overloading the
  database. More workers can be added (horizontal scaling) and each team can deploy its worker
  independently.

## What happens if email is down

Nothing the customer would notice at checkout. The order is stored, stock is reserved and the card
is charged, because those steps don't depend on email. Then:

1. The email worker's send fails, so it doesn't acknowledge the message. The queue redelivers it
   with exponential backoff (for example 1 min, 5 min, 30 min…).
2. After N failed attempts the message moves to a **dead-letter queue (DLQ)**. An alert fires, and
   once the email provider is back, someone replays the DLQ.
3. The order status is already `confirmed`, so the confirmation page and the account page are
   correct the whole time. The receipt is just late. Email is a side effect, not part of the
   order's truth.
4. The email worker records "receipt sent for order X" before acknowledging, so replays never send
   two receipts.

## How my D3-2 approach prevents double charges

A double charge happens when one intended purchase turns into two orders or two payments.
That can come from a double click, a retry after a timeout whose first attempt actually
succeeded, a second tab, or a queue redelivering a message. There are defenses at each layer:

1. **Browser (implemented):** the Place order button is disabled while the request is in flight,
   and a ref rejects a second click before React even re-renders.
2. **Idempotency key (implemented):** the first click creates a UUID in the cart slice
   (`checkoutKeyIssued`). It's saved to localStorage and sent as `Idempotency-Key` on **every
   retry of that checkout**. The server stores the key with the order (in the real design,
   with a unique index on `(user_id, idempotency_key)`), so a retry gets the **same order back**,
   not a new one. The test `checkout.test.tsx` covers the hardest case: the server saves the order,
   the response is lost (500), the user clicks Try again, and stock is decremented only once. A
   changed cart clears the key, because it's a genuinely different order.
3. **Transactional outbox (design):** the order row and its `OrderPlaced` message are written in
   one database transaction, so there's never an order without a job, or a job without an order.
4. **Idempotent payment worker (design):** the worker charges with `idempotency_key = orderId`
   (payment providers like Stripe support this), and checks "is this order already paid?"
   before charging. If the queue delivers `StockReserved` twice, the provider returns the first
   charge's result and no second charge is made.

So the guarantee holds end to end. **One checkout attempt = one key = one order = one charge**,
whatever the browser, network or queue does.
