import { NavLink } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { loggedOut, selectUser } from './sessionSlice';

export function AuthNav() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  if (!user) return <NavLink to="/login">Sign in</NavLink>;

  return (
    <>
      <NavLink to="/account">{user.name.split(' ')[0]}&apos;s account</NavLink>
      <button type="button" onClick={() => dispatch(loggedOut())}>
        Sign out
      </button>
    </>
  );
}
