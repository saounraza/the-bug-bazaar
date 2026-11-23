# API contract

The shared contract every part of The Bug Bazaar builds against. TypeScript types for every shape
live in [`src/api/types.ts`](../src/api/types.ts). The mock backend in
[`src/mocks/handlers.ts`](../src/mocks/handlers.ts) implements this document, and
[`src/mocks/contract.test.ts`](../src/mocks/contract.test.ts) checks it.

## Conventions

- All bodies are JSON. Requests with a body send `Content-Type: application/json`.
- **Prices are integers in cents.** `price: 2499` means $24.99. The client formats them for display
  and never does arithmetic on floating-point dollars.
- Authenticated endpoints expect `Authorization: Bearer <token>` (the token from `POST /api/login`).
- Any endpoint can return `500` if the server fails. The table lists the errors each endpoint is
  expected to return in normal use.

## Types

```ts
type Product = {
  id: string;
  name: string;
  price: number; // cents
  category: 'keyboards' | 'ducks' | 'coffee' | 'stickers';
  stock: number;
  rating: number;
  imageUrl: string;
};

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

type User = { id: string; name: string; email: string };
type Order = { id: string; status: 'queued' | 'processing' | 'confirmed' };
```

## Endpoints

| Method | Endpoint                                      | Success                                   | Errors                          |
| ------ | --------------------------------------------- | ----------------------------------------- | ------------------------------- |
| GET    | `/api/products?search=&category=&sort=&page=` | 200 `{ items: Product[], total: number }` | 500                             |
| GET    | `/api/products/:id`                           | 200 `Product`                             | 404                             |
| POST   | `/api/login`                                  | 200 `{ token, user }`                     | 400, 401                        |
| GET    | `/api/me`                                     | 200 `User`                                | 401                             |
| POST   | `/api/orders`                                 | 201 `{ id, status: "queued" }`            | 400, 401, 409 when out of stock |
| GET    | `/api/orders/:id`                             | 200 `{ id, status }`                      | 401, 404                        |

### `GET /api/products`

| Param      | Values                                                           | Default    |
| ---------- | ---------------------------------------------------------------- | ---------- |
| `search`   | Case-insensitive substring of the product name                   | (none)     |
| `category` | `keyboards`, `ducks`, `coffee`, `stickers`                       | all        |
| `sort`     | `featured`, `price-asc`, `price-desc`, `rating-desc`, `name-asc` | `featured` |
| `page`     | 1-based page number                                              | `1`        |
| `inStock`  | **Extension.** `true` returns only products with `stock > 0`     | `false`    |
| `pageSize` | **Extension.** Items per page, 1 to 100                          | `24`       |

`total` counts every match across all pages, so the client can show "1,234 results" and know when
it has loaded the last page. Unknown `category` or `sort` values are ignored rather than rejected.

**Why the two extensions:** "show only in-stock items" must be applied before pagination, or page 1
could come back with 3 of 24 items and `total` would be wrong. Filtering has to happen on the
server. Both params are optional, so a client that only knows the original contract still works.

### `POST /api/login`

Request: `{ "email": string, "password": string }`

- `400 VALIDATION_FAILED` with `details` keyed by field. Values are machine codes the client maps
  to its own copy: `required`, `invalid_email`.
- `401 INVALID_CREDENTIALS` when the email or password is wrong.

### `POST /api/orders`

Request: `{ "items": [{ "productId": string, "quantity": number }] }`

Header (**extension**): `Idempotency-Key: <uuid>`. The client creates one key per checkout attempt
and sends the same key on every retry of that attempt. If the server has already created an order
for the key, it returns that order again (`201`, header `Idempotent-Replayed: true`) instead of
creating a second one. See [orders.md](orders.md).

- `400 VALIDATION_FAILED`, `details: { items: "invalid" }`: empty list, unknown product or quantity
  below 1.
- `401 UNAUTHORIZED`: missing or expired token.
- `409 OUT_OF_STOCK`: a line asks for more than is in stock. The order is all-or-nothing, so nothing
  is reserved. `details` names the item:
  `{ "productId": "p-0042", "productName": "...", "available": "1" }`.

### `GET /api/orders/:id`

Returns the order's current status. Orders move `queued` → `processing` → `confirmed`. A user can
only read their own orders; anyone else's id returns `404`, so ids can't be probed.

## Error codes

| Status | `error.code`          | Client behaviour                                     |
| ------ | --------------------- | ---------------------------------------------------- |
| 400    | `VALIDATION_FAILED`   | Show field errors next to the matching inputs        |
| 401    | `INVALID_CREDENTIALS` | (Login only) "Email or password is incorrect"        |
| 401    | `UNAUTHORIZED`        | Clear the session and send the user to log in        |
| 404    | `NOT_FOUND`           | Show the Not Found page                              |
| 409    | `OUT_OF_STOCK`        | Name the item that ran out and offer to fix the cart |
| 500    | `INTERNAL_ERROR`      | Show a retry option                                  |

## Live stock (WebSocket)

`ws(s)://<host>/ws/stock`, added for live stock updates (see `docs/decisions.md`).

- Client → server: `{ "type": "subscribe", "productIds": string[] }` replaces the client's
  subscription with the products it is showing.
- Server → client: `{ "type": "stock", "productId": string, "stock": number }`.

## Triggering errors on purpose

The app runs against the mock backend by default. Open **Mock controls** (bug button, bottom right)
to:

- force any endpoint to return any of its listed errors,
- add latency, or make product searches resolve in random order,
- make `POST /api/orders` save the order and then fail with 500 (to test idempotent retries),
- expire every session (next authenticated call returns 401),
- drop the live stock connection, or reset the mock database.

Some errors also happen naturally: open `/products/does-not-exist` for a 404, sign in with a wrong
password for a 401, or leave the login fields empty and submit for a 400.
