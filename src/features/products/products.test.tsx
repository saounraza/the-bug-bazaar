import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('product browsing', () => {
  it('shows a grid of products with price from cents and stock', async () => {
    renderApp('/');
    const grid = await screen.findByRole('grid', { name: 'Products' });
    const cards = within(grid).getAllByRole('article');
    expect(cards.length).toBeGreaterThan(0);
    const first = cards[0]!;
    expect(within(first).getByText(/^\$\d+\.\d{2}$/)).toBeInTheDocument();
    expect(within(first).getByText(/in stock|left|out of stock/i)).toBeInTheDocument();
  });

  it('opens a product details page from the grid with the keyboard', async () => {
    const { user } = renderApp('/');
    const grid = await screen.findByRole('grid', { name: 'Products' });
    const firstLink = within(grid).getAllByRole('link')[0]!;
    const name = firstLink.textContent ?? '';
    firstLink.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument();
  });

  it('the grid is one Tab stop, and arrow keys move between cards', async () => {
    const { user } = renderApp('/');
    const grid = await screen.findByRole('grid', { name: 'Products' });
    const links = within(grid).getAllByRole('link');
    // Roving tabindex: only the first card is in the Tab order.
    expect(links.filter((link) => link.tabIndex === 0)).toHaveLength(1);

    links[0]!.focus();
    await user.keyboard('{ArrowRight}');
    expect(within(grid).getAllByRole('link')[1]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(within(grid).getAllByRole('link')[0]).toHaveFocus();
  });

  it('renders only a window of cards, not every loaded product', async () => {
    renderApp('/');
    const grid = await screen.findByRole('grid', { name: 'Products' });
    expect(Number(grid.getAttribute('data-total-loaded'))).toBeGreaterThanOrEqual(60);
    expect(within(grid).getAllByRole('article').length).toBeLessThan(20);
  });
});
