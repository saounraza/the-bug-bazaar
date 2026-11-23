import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const resultCount = () => screen.findByText(/results?( for|$)/);

describe('product filters', () => {
  it('restores filters from the URL (refresh or a copied link)', async () => {
    renderApp('/?q=duck&category=ducks&sort=price-asc&inStock=1');
    expect(await screen.findByRole('searchbox', { name: 'Search products' })).toHaveValue('duck');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('ducks');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price-asc');
    expect(screen.getByRole('checkbox', { name: 'In stock only' })).toBeChecked();
    expect(await resultCount()).toHaveTextContent(/for “duck”/);
  });

  it('writes filters to the URL and only shows matching products', async () => {
    const { user, router } = renderApp('/');
    await screen.findByRole('grid', { name: 'Products' });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'coffee');
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'espresso');

    await screen.findByText(/for “espresso”/, {}, { timeout: 3000 });
    const params = new URLSearchParams(router.state.location.search);
    expect(Object.fromEntries(params)).toEqual({ category: 'coffee', q: 'espresso' });
    const names = within(screen.getByRole('grid', { name: 'Products' }))
      .getAllByRole('link')
      .map((link) => link.textContent?.toLowerCase());
    expect(names.every((name) => name?.includes('espresso'))).toBe(true);
  });

  it('shows the empty state, and Clear filters resets the URL', async () => {
    const { user, router } = renderApp('/?q=zzzz-nothing');
    expect(await screen.findByText('No products match')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!);
    expect(router.state.location.search).toBe('');
    expect(await screen.findByText('5,000 results')).toBeInTheDocument();
  });

  it('the Back button returns to the previous filter view', async () => {
    const { user, router } = renderApp('/');
    await screen.findByText('5,000 results');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'stickers');
    expect(await screen.findByText('1,250 results')).toBeInTheDocument();

    await act(() => router.navigate(-1));
    expect(await screen.findByText('5,000 results')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
  });
});
