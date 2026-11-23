import { act, screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { queryProducts } from '../../mocks/db';
import { server } from '../../mocks/node';
import { renderApp } from '../../test/renderApp';

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe('search race conditions', () => {
  it('an older, slower response never replaces results for the latest query', async () => {
    const completed: string[] = [];
    // Older queries are slower: "du" takes 800 ms, "duck" takes 50 ms,
    // so the responses come back in the opposite order to the requests.
    server.use(
      http.get('*/api/products', async ({ request }) => {
        const search = new URL(request.url).searchParams.get('search') ?? '';
        await delay(search === 'du' ? 800 : 50);
        completed.push(search);
        return HttpResponse.json(queryProducts({ search, pageSize: 60 }));
      }),
    );

    const { user } = renderApp('/');
    await screen.findByText('5,000 results');
    const input = screen.getByRole('searchbox', { name: 'Search products' });

    await user.type(input, 'du');
    await wait(350); // debounce fires, the slow "du" request starts
    await user.type(input, 'ck');
    expect(await screen.findByText(/for “duck”/, {}, { timeout: 2000 })).toBeInTheDocument();

    await wait(900); // now the stale "du" response arrives
    expect(completed).toEqual(['', 'duck', 'du']);
    expect(screen.getByText(/results for “duck”/)).toBeInTheDocument();
    expect(screen.queryByText(/for “du”/)).not.toBeInTheDocument();
  });

  it('while a new query loads, results for the previous query are not shown', async () => {
    server.use(
      http.get('*/api/products', async ({ request }) => {
        const search = new URL(request.url).searchParams.get('search') ?? '';
        await delay(search === 'rubber duck' ? 1000 : 0);
        return HttpResponse.json(queryProducts({ search, pageSize: 60 }));
      }),
    );

    const { user } = renderApp('/?q=rubber');
    expect(await screen.findByText(/for “rubber”/)).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), ' duck');
    await wait(400); // debounce fired, "rubber duck" is in flight

    // The "rubber" grid must not stay on screen under the "rubber duck" query.
    expect(screen.queryByRole('grid', { name: 'Products' })).not.toBeInTheDocument();
    expect(screen.getByText('Loading products')).toBeInTheDocument();
    expect(await screen.findByText(/for “rubber duck”/, {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
