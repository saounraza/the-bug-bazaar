import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createStockFeed, type FeedStatus } from '../../api/stockFeed';
import { getProduct, setStock } from '../../mocks/db';
import { connectedStockClients, dropAllStockClients, runStockTick } from '../../mocks/stockSocket';
import { renderApp } from '../../test/renderApp';

describe('live stock over WebSocket', () => {
  it('updates stock on the page without a refresh', async () => {
    setStock('p-0007', 20);
    renderApp('/products/p-0007');
    expect(await screen.findByText('20 in stock')).toBeInTheDocument();
    await screen.findByText('Live stock');

    // The only subscribed product is p-0007, so the server's next tick changes it.
    act(() => runStockTick());
    const stock = getProduct('p-0007')!.stock;
    expect(stock).not.toBe(20);
    const expected = stock <= 5 ? `Only ${stock} left` : `${stock} in stock`;
    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.queryByText('20 in stock')).not.toBeInTheDocument();
  });

  it('reconnects after the server drops the connection, and re-subscribes', async () => {
    const statuses: FeedStatus[] = [];
    const updates: string[] = [];
    setStock('p-0008', 20);
    const feed = createStockFeed({
      url: 'ws://localhost:3000/ws/stock',
      onStatus: (status) => statuses.push(status),
      onStock: ({ productId }) => updates.push(productId),
      baseDelayMs: 10,
    });
    feed.subscribe(['p-0008']);
    await waitFor(() => expect(statuses).toContain('open'));

    dropAllStockClients();
    await waitFor(() => expect(statuses).toContain('reconnecting'));
    await waitFor(() => expect(statuses.filter((s) => s === 'open')).toHaveLength(2));

    // Still subscribed after the reconnect: updates keep flowing.
    await waitFor(() => {
      runStockTick();
      expect(updates).toContain('p-0008');
    });
    feed.close();
  });

  it('closes the connection when the page closes', async () => {
    const { router } = renderApp('/products/p-0009');
    await screen.findByText('Live stock');
    expect(connectedStockClients()).toBe(1);

    await act(() => router.navigate('/cart'));
    await waitFor(() => expect(connectedStockClients()).toBe(0));
  });
});
