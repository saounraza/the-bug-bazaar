import { useEffect, useLayoutEffect, useRef } from 'react';

type Target = Window | Document | HTMLElement | null | undefined;

/**
 * Subscribes to a DOM event for as long as the component is mounted, and
 * always removes the listener on unmount or when the target/type changes.
 *
 * The latest handler is kept in a ref, so passing an inline arrow function
 * does not remove and re-add the listener on every render.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  target: Target = typeof window === 'undefined' ? undefined : window,
  options?: AddEventListenerOptions,
): void {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  const passive = options?.passive;
  const capture = options?.capture;

  useEffect(() => {
    if (!target) return;
    const listener = (event: Event) => handlerRef.current(event as WindowEventMap[K]);
    const listenerOptions = { passive, capture };
    target.addEventListener(type, listener, listenerOptions);
    return () => target.removeEventListener(type, listener, listenerOptions);
  }, [type, target, passive, capture]);
}
