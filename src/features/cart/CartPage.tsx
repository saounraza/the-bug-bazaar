import { Link } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { EmptyState } from '../../components/StatusViews';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';
import { selectCartLines, selectHasUnavailableItems } from './cartSlice';

export function CartPage() {
  useDocumentTitle('Cart');
  const lines = useAppSelector(selectCartLines);
  const blocked = useAppSelector(selectHasUnavailableItems);

  return (
    <section className="page-narrow">
      <h1 tabIndex={-1}>Your cart</h1>
      {lines.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          message="Rubber ducks are standing by to help you debug."
          action={
            <Link className="button" to="/">
              Browse products
            </Link>
          }
        />
      ) : (
        <>
          <ul className="cart-list" aria-label="Cart items">
            {lines.map((line) => (
              <CartLineItem key={line.productId} line={line} />
            ))}
          </ul>
          <CartSummary>
            {blocked ? (
              <p className="field__error">Remove sold-out items to continue.</p>
            ) : (
              <Link className="button" to="/checkout">
                Go to checkout
              </Link>
            )}
          </CartSummary>
        </>
      )}
    </section>
  );
}
