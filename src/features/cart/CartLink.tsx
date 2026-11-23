import { NavLink } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { selectCartCount } from './cartSlice';

export function CartLink() {
  const count = useAppSelector(selectCartCount);
  const label = count === 1 ? '1 item' : `${count} items`;
  return (
    <NavLink to="/cart" aria-label={`Cart, ${label}`}>
      <span aria-hidden="true">🛒</span> Cart
      <span className="cart-badge" aria-hidden="true">
        {count}
      </span>
    </NavLink>
  );
}
