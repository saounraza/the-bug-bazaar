import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setForcedError } from '../../mocks/chaos';
import { renderApp } from '../../test/renderApp';

describe('UI states', () => {
  it('list: shows an error with a retry that recovers', async () => {
    setForcedError('listProducts', 500);
    const { user } = renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');

    setForcedError('listProducts', undefined);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('grid', { name: 'Products' })).toBeInTheDocument();
  });

  it('details: an unknown product shows the Not Found page', async () => {
    renderApp('/products/does-not-exist');
    expect(
      await screen.findByRole('heading', { name: /couldn.t find that product/i }),
    ).toBeInTheDocument();
  });

  it('details: a server error shows the same error box with retry', async () => {
    setForcedError('getProduct', 500);
    renderApp('/products/p-0001');
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
