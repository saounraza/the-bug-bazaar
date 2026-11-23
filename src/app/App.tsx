import { useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from './store';

export function App() {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <main>
        <h1>The Bug Bazaar</h1>
      </main>
    </Provider>
  );
}
