import { useEffect, useId, useState } from 'react';
import type { Product } from '../../api/types';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { itemAdded, selectQuantityInCart } from './cartSlice';

const CONFIRMATION_MS = 2500;

export function AddToCart({ product }: { product: Product }) {
  const id = useId();
  const dispatch = useAppDispatch();
  const inCart = useAppSelector((state) => selectQuantityInCart(state, product.id));
  const remaining = Math.max(0, product.stock - inCart);
  const [quantity, setQuantity] = useState(1);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  // The confirmation hides itself; the timer is cleared if the page closes first.
  useEffect(() => {
    if (addedCount === null) return;
    const timer = setTimeout(() => setAddedCount(null), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [addedCount]);

  if (product.stock <= 0) {
    return <p className="hint">This item is out of stock. Check back soon.</p>;
  }

  const safeQuantity = Math.min(Math.max(1, quantity), Math.max(1, remaining));

  return (
    <div>
      <div className="details__buy">
        <div className="field">
          <label htmlFor={`${id}-qty`}>Quantity</label>
          <input
            id={`${id}-qty`}
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, remaining)}
            value={safeQuantity}
            disabled={remaining === 0}
            onChange={(event) => setQuantity(Number(event.target.value) || 1)}
          />
        </div>
        <button
          type="button"
          className="button"
          disabled={remaining === 0}
          onClick={() => {
            dispatch(itemAdded({ product, quantity: safeQuantity }));
            setAddedCount(safeQuantity);
            setQuantity(1);
          }}
        >
          Add to cart
        </button>
      </div>
      <p className="hint" role="status">
        {addedCount !== null
          ? `Added ${addedCount} to your cart.`
          : remaining === 0
            ? `You have all ${product.stock} in your cart.`
            : inCart > 0
              ? `${inCart} already in your cart.`
              : ''}
      </p>
    </div>
  );
}
