import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { describeError, isAppError, type AppError } from '../../api/errors';
import { useAppDispatch, useAppSelector, useAppStore } from '../../app/hooks';
import { EmptyState } from '../../components/StatusViews';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { selectUser } from '../auth/sessionSlice';
import { CartSummary } from '../cart/CartSummary';
import {
  cartCleared,
  checkoutKeyIssued,
  selectCartLines,
  selectHasUnavailableItems,
  stockUpdated,
} from '../cart/cartSlice';
import { useCreateOrderMutation } from './ordersApi';

export function CheckoutPage() {
  useDocumentTitle('Checkout');
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const navigate = useNavigate();
  const lines = useAppSelector(selectCartLines);
  const user = useAppSelector(selectUser);
  const blocked = useAppSelector(selectHasUnavailableItems);
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [error, setError] = useState<AppError | null>(null);
  const inFlight = useRef(false);

  if (lines.length === 0) {
    return (
      <section className="page-narrow">
        <h1 tabIndex={-1}>Checkout</h1>
        <EmptyState
          title="Nothing to check out"
          message="Your cart is empty."
          action={
            <Link className="button" to="/">
              Browse products
            </Link>
          }
        />
      </section>
    );
  }

  async function placeOrder() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);

    // Reuses the key if this is a retry of the same cart; creates one otherwise.
    dispatch(checkoutKeyIssued());
    const idempotencyKey = store.getState().cart.checkoutKey ?? crypto.randomUUID();

    try {
      const order = await createOrder({
        idempotencyKey,
        items: lines.map(({ productId, quantity }) => ({ productId, quantity })),
      }).unwrap();
      dispatch(cartCleared());
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (caught) {
      const appError: AppError = isAppError(caught) ? caught : { kind: 'server', status: 0 };
      if (appError.kind === 'out-of-stock') {
        // Name the item the way the user saw it in their cart, and lower its limit.
        const line = lines.find((l) => l.productId === appError.productId);
        dispatch(stockUpdated({ productId: appError.productId, stock: appError.available }));
        setError({ ...appError, productName: line?.name ?? appError.productName });
      } else {
        // A 401 is handled globally: the session is cleared and RequireAuth redirects.
        setError(appError);
      }
    } finally {
      inFlight.current = false;
    }
  }

  const message = error ? describeError(error) : null;

  return (
    <section className="page-narrow">
      <h1 tabIndex={-1}>Checkout</h1>
      <p className="hint">Signed in as {user?.email}. This demo store never charges a card.</p>

      <div role="alert">
        {error && message && error.kind !== 'unauthorized' && (
          <div className={error.kind === 'out-of-stock' ? 'alert alert--warn' : 'alert'}>
            <span className="alert__title">{message.title}</span>
            <p>{message.message}</p>
            {error.kind === 'out-of-stock' && (
              <p>
                <Link to="/cart">Review your cart</Link>
              </p>
            )}
          </div>
        )}
      </div>

      <ul className="cart-list" aria-label="Items in this order">
        {lines.map((line) => (
          <li key={line.productId} className="summary__row">
            <span>
              {line.quantity} × {line.name}
            </span>
          </li>
        ))}
      </ul>

      <CartSummary>
        <button
          type="button"
          className="button"
          disabled={isLoading || blocked}
          onClick={() => void placeOrder()}
        >
          {isLoading ? 'Placing order…' : error?.kind === 'server' ? 'Try again' : 'Place order'}
        </button>
      </CartSummary>
    </section>
  );
}
