import { NavLink } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { selectCartCount } from './cartSlice';

export function CartLink() {
  const count = useAppSelector(selectCartCount);
  // The accessible name ("Cart 3 items") starts with the visible text ("Cart 3"),
  // so voice-control users can say what they see.
  return (
    <NavLink to="/cart">
      <span aria-hidden="true">🛒</span> Cart{' '}
      <span className="cart-badge">
        {count} <span className="visually-hidden">{count === 1 ? 'item' : 'items'}</span>
      </span>
    </NavLink>
  );
}
