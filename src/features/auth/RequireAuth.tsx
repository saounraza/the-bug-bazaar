import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { selectIsAuthenticated } from './sessionSlice';

export type ReturnToState = { from?: { pathname: string; search: string; hash: string } };

/**
 * Guards a route. Signed-out users go to /login carrying where they were, so
 * the login page can send them back. Because it reads the session from the
 * store, a 401 anywhere (which clears the session) also redirects from here.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { pathname, search, hash } = useLocation();

  if (!isAuthenticated) {
    const state: ReturnToState = { from: { pathname, search, hash } };
    return <Navigate to="/login" replace state={state} />;
  }
  return <>{children}</>;
}
