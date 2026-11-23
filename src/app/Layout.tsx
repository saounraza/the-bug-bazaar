import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { AuthNav } from '../features/auth/AuthNav';
import { CartLink } from '../features/cart/CartLink';

// Loaded only when the mock API is on, so it never ships to a real-backend build's main chunk.
const MockControls = lazy(() => import('../features/devtools/MockControls'));
const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== 'false';

export function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const lastPathname = useRef(pathname);

  // After client-side navigation, move focus to the new page's heading so
  // screen reader and keyboard users start at the top of the new content.
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    const heading = mainRef.current?.querySelector<HTMLElement>('h1');
    heading?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="logo">
            <span aria-hidden="true">🐞</span> The Bug Bazaar
          </Link>
          <nav aria-label="Main" className="nav">
            <NavLink to="/" end>
              Shop
            </NavLink>
            <AuthNav />
            <CartLink />
          </nav>
        </div>
      </header>
      <main id="main" ref={mainRef} className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>The Bug Bazaar · Prices in USD · Demo store, no real orders.</p>
      </footer>
      {mocksEnabled && (
        <Suspense fallback={null}>
          <MockControls />
        </Suspense>
      )}
      <ScrollRestoration />
    </>
  );
}
