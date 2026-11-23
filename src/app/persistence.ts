import { isCartState, type CartState } from '../features/cart/cartSlice';
import { isSessionState, type SessionState } from '../features/auth/sessionSlice';

/**
 * What survives a reload. Only the cart and the session are saved: server
 * data is re-fetched (it may be stale), and URL state is already in the URL.
 * Every value is validated on load, because localStorage can hold anything:
 * an older app version's shape, a manual edit, or corrupted JSON.
 */

export const CART_KEY = 'bb-cart';
export const SESSION_KEY = 'bb-session';

function read<T>(key: string, guard: (value: unknown) => value is T): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    return guard(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled: the app keeps working, it just won't persist.
  }
}

export function loadPersistedState(): { cart?: CartState; session?: SessionState } {
  const cart = read(CART_KEY, isCartState);
  const session = read(SESSION_KEY, isSessionState);
  return {
    ...(cart ? { cart } : {}),
    // A saved "expired" notice should not greet the user on every reload.
    ...(session
      ? { session: session.status === 'anonymous' ? { ...session, notice: null } : session }
      : {}),
  };
}

export function saveCart(cart: CartState): void {
  write(CART_KEY, cart);
}

export function saveSession(session: SessionState): void {
  write(SESSION_KEY, session);
}
