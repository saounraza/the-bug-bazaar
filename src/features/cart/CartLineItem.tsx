import { useId } from 'react';
import { Link } from 'react-router';
import { useAppDispatch } from '../../app/hooks';
import { Price } from '../../components/Price';
import { lineTotal } from '../../lib/money';
import { itemRemoved, quantityChanged, type CartLine } from './cartSlice';

export function CartLineItem({ line }: { line: CartLine }) {
  const id = useId();
  const dispatch = useAppDispatch();
  const soldOut = line.stock <= 0;

  return (
    <li className="cart-line">
      <img src={line.imageUrl} alt="" width={88} height={66} />
      <div>
        <p className="cart-line__name">
          <Link to={`/products/${line.productId}`}>{line.name}</Link>
        </p>
        <p className="hint">
          <Price cents={line.price} /> each
        </p>
        {soldOut ? (
          <p className="field__error">Sold out. Remove it to check out.</p>
        ) : (
          <div className="cart-line__controls">
            <label htmlFor={`${id}-qty`}>Quantity</label>
            <input
              id={`${id}-qty`}
              type="number"
              inputMode="numeric"
              min={1}
              max={line.stock}
              value={line.quantity}
              aria-describedby={`${id}-stock`}
              onChange={(event) =>
                dispatch(
                  quantityChanged({
                    productId: line.productId,
                    quantity: Number(event.target.value),
                  }),
                )
              }
            />
            <span className="hint" id={`${id}-stock`}>
              {line.reducedFrom
                ? `Lowered from ${line.reducedFrom}: only ${line.stock} left.`
                : `Max ${line.stock}`}
            </span>
          </div>
        )}
        <button
          type="button"
          className="link-button"
          aria-label={`Remove ${line.name}`}
          onClick={() => dispatch(itemRemoved(line.productId))}
        >
          Remove
        </button>
      </div>
      <p className="cart-line__total">
        <Price cents={lineTotal(line.price, line.quantity)} />
      </p>
    </li>
  );
}
