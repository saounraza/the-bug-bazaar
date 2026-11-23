import { useState } from 'react';
import { useEventListener } from '../hooks/useEventListener';

const SHOW_AFTER_PX = 600;

/**
 * Appears after scrolling down. Its scroll listener is added on mount and
 * removed on unmount by useEventListener, so nothing keeps listening after
 * the page closes.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEventListener('scroll', () => setVisible(window.scrollY > SHOW_AFTER_PX), window, {
    passive: true,
  });

  if (!visible) return null;

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    // Move keyboard focus too, otherwise the next Tab jumps back down the page.
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  };

  return (
    <button type="button" className="button back-to-top" onClick={scrollToTop}>
      <span aria-hidden="true">↑</span> Back to top
    </button>
  );
}
