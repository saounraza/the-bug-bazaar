import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';
import { useDocumentTitle } from './useDocumentTitle';
import { useEventListener } from './useEventListener';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only publishes the last value after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'k' },
    });
    rerender({ value: 'ke' });
    rerender({ value: 'key' });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('k');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('key');
  });

  it('never applies a pending value after unmount', () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });
    rerender({ value: 'b' });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current).toBe('a');
  });
});

describe('useEventListener', () => {
  it('calls the latest handler and removes the listener on unmount', () => {
    const first = vi.fn<(e: Event) => void>();
    const second = vi.fn<(e: Event) => void>();
    const { rerender, unmount } = renderHook(({ handler }) => useEventListener('resize', handler), {
      initialProps: { handler: first },
    });
    rerender({ handler: second });
    window.dispatchEvent(new Event('resize'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    window.dispatchEvent(new Event('resize'));
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useDocumentTitle', () => {
  it('sets the page title and restores it on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Cart'));
    expect(document.title).toBe('Cart · The Bug Bazaar');
    unmount();
    expect(document.title).toBe('The Bug Bazaar');
  });
});
