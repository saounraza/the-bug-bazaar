# Authentication

## Flow

1. `POST /api/login` with email and password returns `{ token, user }`.
2. `loggedIn({ token, user })` puts both in the `session` slice. A listener middleware saves the
   slice to **localStorage** (`bb-session`) so the session survives a reload.
3. Every request goes through `request()` in `src/api/client.ts`, which reads the token with
   `getToken()` and sends `Authorization: Bearer <token>`.
4. If a request **that carried a token** comes back `401`, the client calls `onUnauthorized()`,
   which dispatches `sessionExpired()`. The session becomes anonymous, localStorage is
   overwritten, and `<RequireAuth>` redirects to `/login` with a "Your session expired" notice. A
   401 from the login form itself means "wrong password" and does **not** sign anyone out.
5. `<RequireAuth>` wraps `/account`, `/checkout` and `/orders/:id`. It redirects to `/login` with
   `state.from` set to the page you were on. After signing in, the login page sends you back to it
   (path, query string and hash), or to `/account` if there is nowhere to return to.
6. **Sign out** dispatches `loggedOut()`. The next login invalidates the cached `Me` and `Order`
   data, so one user never sees another's.

**Double submit:** the submit handler checks a ref (`inFlight`) that flips synchronously, so a
double click or a second Enter press is ignored even before React re-renders the disabled button.
A test double-clicks, presses Enter, and checks that only one `POST /api/login` was sent.

**Try it:** demo account `demo@bugbazaar.dev` / `password123`. To test expiry, open Mock controls
→ **Expire all sessions**, then open the account page or check out.

## Where the token is stored, and the trade-off

**Chosen: localStorage, mirrored in Redux.**

| Option                              | Survives reload | Readable by injected JS (XSS) | Sent automatically (CSRF risk) | Needs backend support            |
| ----------------------------------- | --------------- | ----------------------------- | ------------------------------ | -------------------------------- |
| Memory only (Redux)                 | No              | Yes, while the page is open   | No                             | No                               |
| sessionStorage                      | Same tab only   | Yes                           | No                             | No                               |
| **localStorage** (chosen)           | Yes             | Yes                           | No                             | No                               |
| `HttpOnly; Secure; SameSite` cookie | Yes             | **No**                        | Yes, mitigated by `SameSite`   | Yes: cookie issuing, CSRF tokens |

**Why localStorage here:** the backend is a mock running in the browser, so it can't set an
`HttpOnly` cookie, and the contract returns the token in the response body. The brief also wants
the cart and session to survive a reload. localStorage is the simplest option that meets both.

**The cost:** any script running on the page can read localStorage, so an XSS bug would leak the
token. Mitigations in this app: React escapes everything it renders, we never use
`dangerouslySetInnerHTML`, there are no third-party scripts, and a 401 clears the token at once.

**What I'd do with a real backend:** issue a short-lived access token kept **in memory only**, plus
a refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie. JavaScript can never read the
long-lived credential, a reload silently gets a new access token from the refresh endpoint, and
`SameSite` handles most CSRF risk. The client change is small, because only `getToken()` and the
401 handler in `src/api/client.ts` know where the token lives.
