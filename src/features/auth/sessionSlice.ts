import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../api/types';

/**
 * A discriminated union: a token without a user (or the reverse) can't be
 * represented, and `notice` only exists while signed out.
 */
export type SessionState =
  | { status: 'anonymous'; notice: 'expired' | 'signed-out' | null }
  | { status: 'authenticated'; token: string; user: User };

export const initialSessionState: SessionState = { status: 'anonymous', notice: null };

export const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState as SessionState,
  reducers: {
    loggedIn: (_state, action: PayloadAction<{ token: string; user: User }>): SessionState => ({
      status: 'authenticated',
      ...action.payload,
    }),
    userRefreshed(state, action: PayloadAction<User>) {
      if (state.status === 'authenticated') state.user = action.payload;
    },
    loggedOut: (): SessionState => ({ status: 'anonymous', notice: 'signed-out' }),
    /** Any authenticated request came back 401. */
    sessionExpired: (state): SessionState =>
      state.status === 'authenticated' ? { status: 'anonymous', notice: 'expired' } : state,
    noticeDismissed(state) {
      if (state.status === 'anonymous') state.notice = null;
    },
  },
});

export const { loggedIn, userRefreshed, loggedOut, sessionExpired, noticeDismissed } =
  sessionSlice.actions;

type WithSession = { session: SessionState };

export const selectSession = (state: WithSession) => state.session;
export const selectIsAuthenticated = (state: WithSession) =>
  state.session.status === 'authenticated';
export const selectToken = (state: WithSession) =>
  state.session.status === 'authenticated' ? state.session.token : null;
export const selectUser = (state: WithSession) =>
  state.session.status === 'authenticated' ? state.session.user : null;

export function isSessionState(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Record<string, unknown>;
  if (session.status === 'anonymous') return true;
  const user = session.user as Record<string, unknown> | undefined;
  return (
    session.status === 'authenticated' &&
    typeof session.token === 'string' &&
    typeof user?.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string'
  );
}
