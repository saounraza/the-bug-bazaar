import { act, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { queryProducts } from '../../mocks/db';
import { server } from '../../mocks/node';
import { renderApp } from '../../test/renderApp';

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

describe('search race conditions', () => {
  it('an older, slower response never replaces results for the latest query', async () => {
    const started: string[] = [];
    const completed: string[] = [];
    // A gate instead of fixed delays: the "du" response is held until the
    // "duck" response has been sent, so the responses are *guaranteed* to
    // arrive in the opposite order to the requests, however slow the machine.
    let releaseOldQuery!: () => void;
    const duckSent = new Promise<void>((resolve) => (releaseOldQuery = resolve));
    server.use(
      http.get('*/api/products', async ({ request }) => {
        const search = new URL(request.url).searchParams.get('search') ?? '';
        started.push(search);
        if (search === 'du') await duckSent;
        completed.push(search);
        if (search === 'duck') setTimeout(releaseOldQuery, 50);
        return HttpResponse.json(queryProducts({ search, pageSize: 60 }));
      }),
    );

    const { user } = renderApp('/');
    await screen.findByText('5,000 results');
    const input = screen.getByRole('searchbox', { name: 'Search products' });

    await user.type(input, 'du');
    await waitFor(() => expect(started).toContain('du')); // debounce fired, "du" is in flight
    await user.type(input, 'ck');
    expect(await screen.findByText(/for “duck”/)).toBeInTheDocument();

    await waitFor(() => expect(completed).toContain('du')); // the stale response lands
    await wait(50); // give React a moment to (wrongly) render it, if it were going to
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
