import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes';
import { makeStore, type RootState } from '../app/store';

/** Renders the whole app (real store, router and API mocks) at a given URL. */
export function renderApp(path = '/', preloadedState?: Partial<RootState>) {
  const store = makeStore(preloadedState);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  const utils = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { ...utils, store, router, user };
}
