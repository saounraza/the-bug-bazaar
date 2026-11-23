import { useState } from 'react';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './routes';
import { makeStore } from './store';

export function App() {
  const [store] = useState(makeStore);
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}
