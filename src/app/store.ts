import { combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../api/baseApi';
import { configureClient } from '../api/client';
import { sessionExpired, sessionSlice, selectToken } from '../features/auth/sessionSlice';
import { cartSlice } from '../features/cart/cartSlice';
import { apiErrorLogger } from './apiErrorLogger';
import { saveCart, saveSession } from './persistence';

const rootReducer = combineReducers({
  [api.reducerPath]: api.reducer,
  [cartSlice.name]: cartSlice.reducer,
  [sessionSlice.name]: sessionSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  const listener = createListenerMiddleware();

  // Persist the cart and session whenever they change, outside the reducers
  // (reducers must stay pure, so they never touch localStorage themselves).
  listener.startListening({
    predicate: (_action, current, previous) =>
      (current as RootState).cart !== (previous as RootState).cart,
    effect: (_action, { getState }) => saveCart((getState() as RootState).cart),
  });
  listener.startListening({
    predicate: (_action, current, previous) =>
      (current as RootState).session !== (previous as RootState).session,
    effect: (_action, { getState }) => saveSession((getState() as RootState).session),
  });

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) =>
      getDefault().prepend(listener.middleware).concat(api.middleware, apiErrorLogger),
  });

  setupListeners(store.dispatch);

  // The HTTP client reads the token and reports 401s through these callbacks,
  // so it never imports the store (no circular dependency).
  configureClient({
    getToken: () => selectToken(store.getState()),
    onUnauthorized: () => store.dispatch(sessionExpired()),
  });

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
