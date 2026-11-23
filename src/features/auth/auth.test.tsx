import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setChaos } from '../../mocks/chaos';
import { DEMO_PASSWORD, DEMO_USER, revokeAllSessions } from '../../mocks/db';
import { server } from '../../mocks/node';
import { renderApp } from '../../test/renderApp';

async function fillLogin(
  user: ReturnType<typeof renderApp>['user'],
  email: string,
  password: string,
) {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
}

describe('login and session', () => {
  it('protects the account page and returns the user there after signing in', async () => {
    const { user, router } = renderApp('/account');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

    await fillLogin(user, DEMO_USER.email, DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Your account' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/account');
    expect(await screen.findByText(DEMO_USER.email)).toBeInTheDocument();
  });

  it('shows a friendly error for a wrong password and stays signed out', async () => {
    const { user, store } = renderApp('/login');
    await fillLogin(user, DEMO_USER.email, 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('That email and password do not match.')).toBeInTheDocument();
    expect(store.getState().session.status).toBe('anonymous');
  });

  it('announces field errors from a 400 next to the right inputs', async () => {
    const { user } = renderApp('/login');
    await user.type(await screen.findByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const email = screen.getByLabelText('Email');
    expect(await screen.findAllByText(/Enter a valid email address/)).not.toHaveLength(0);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Enter a valid email address/);
    expect(screen.getByRole('alert')).toHaveTextContent(/email: Enter a valid email/);
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('cannot be double-submitted', async () => {
    setChaos({ latencyMs: 200 });
    let loginRequests = 0;
    const count = ({ request }: { request: Request }) => {
      if (request.url.endsWith('/api/login')) loginRequests++;
    };
    server.events.on('request:start', count);

    const { user } = renderApp('/login');
    await fillLogin(user, DEMO_USER.email, DEMO_PASSWORD);
    const button = screen.getByRole('button', { name: 'Sign in' });
    await user.dblClick(button);
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: 'Your account' })).toBeInTheDocument();
    server.events.removeListener('request:start', count);
    expect(loginRequests).toBe(1);
  });

  it('a 401 clears the session and sends the user to sign in again', async () => {
    const { user, store, router } = renderApp('/account');
    await fillLogin(user, DEMO_USER.email, DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText(DEMO_USER.email);

    revokeAllSessions(); // the server forgets every token
    await act(() => router.navigate('/'));
    await screen.findByRole('heading', { name: 'Shop developer gear' });
    await act(() => router.navigate('/account')); // /me now answers 401

    expect(await screen.findByText('Your session expired')).toBeInTheDocument();
    expect(store.getState().session.status).toBe('anonymous');
    expect(localStorage.getItem('bb-session')).toContain('anonymous');
    expect(router.state.location.pathname).toBe('/login');
  });
});
