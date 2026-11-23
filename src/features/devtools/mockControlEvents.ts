/**
 * A tiny typed event bus so the Mock controls can poke parts of the app
 * (the live stock feed, the error boundary demo) without importing them.
 */
type MockControlEvent = 'drop-stock-feed' | 'throw-render-error';
type Listener = () => void;

const listeners = new Map<MockControlEvent, Set<Listener>>();

export const mockControlEvents = {
  on(event: MockControlEvent, listener: Listener): () => void {
    const set = listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(event, set);
    return () => set.delete(listener);
  },
  emit(event: MockControlEvent): void {
    listeners.get(event)?.forEach((listener) => listener());
  },
};
