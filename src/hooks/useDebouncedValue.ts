import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 * Typing "keyboard" quickly produces one update instead of eight.
 * The pending timer is cleared whenever the value changes or the component
 * unmounts, so a stale value can never be applied late.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // With no delay the value is returned directly below; no timer needed.
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return delayMs <= 0 ? value : debounced;
}
