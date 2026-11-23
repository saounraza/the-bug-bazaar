import type { ReactNode } from 'react';
import { useAppSelector } from '../../app/hooks';
import { Price } from '../../components/Price';
import { selectCartCount, selectCartTotal } from './cartSlice';

export function CartSummary({ children }: { children?: ReactNode }) {
  const count = useAppSelector(selectCartCount);
  const total = useAppSelector(selectCartTotal);
  return (
    <aside className="summary" aria-label="Order summary">
      <p className="summary__row">
        <span>Items</span> <span>{count}</span>
      </p>
      <p className="summary__row">
        <span>Shipping</span> <span>Free</span>
      </p>
      <p className="summary__row summary__row--total">
        <span>Total</span> <Price cents={total} />
      </p>
      {children}
    </aside>
  );
}
