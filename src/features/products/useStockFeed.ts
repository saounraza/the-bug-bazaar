import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createStockFeed,
  stockSocketUrl,
  type FeedStatus,
  type StockFeed,
} from '../../api/stockFeed';
import { useAppDispatch } from '../../app/hooks';
import { useEventListener } from '../../hooks/useEventListener';
import { stockChanged } from './liveStock';

const parseIds = (key: string) => (key ? key.split(',') : []);

/**
 * Keeps a live stock connection open while the calling page is mounted,
 * subscribed to `productIds`. Returns the connection status for the UI.
 *
 * Cleanup: unmounting closes the socket and cancels any pending reconnect.
 * `pagehide` (tab closed, navigated away, or put in the back/forward cache)
 * closes it too, and `pageshow` from the back/forward cache opens a new one.
 */
export function useStockFeed(productIds: string[]): FeedStatus {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<FeedStatus>('connecting');
  const feedRef = useRef<StockFeed | null>(null);
  const idsKey = productIds.join(',');
  const idsRef = useRef(idsKey);

  const close = useCallback(() => {
    feedRef.current?.close();
    feedRef.current = null;
  }, []);

  const open = useCallback(() => {
    close();
    const feed = createStockFeed({
      url: stockSocketUrl(),
      onStock: ({ productId, stock }) => dispatch(stockChanged(productId, stock)),
      onStatus: setStatus,
    });
    feed.subscribe(parseIds(idsRef.current));
    feedRef.current = feed;
  }, [close, dispatch]);

  useEffect(() => {
    open();
    return close;
  }, [open, close]);

  useEffect(() => {
    idsRef.current = idsKey;
    feedRef.current?.subscribe(parseIds(idsKey));
  }, [idsKey]);

  useEventListener('online', () => feedRef.current?.reconnectNow());
  useEventListener('pagehide', close);
  useEventListener('pageshow', (event) => {
    if (event.persisted) open();
  });

  return status;
}
