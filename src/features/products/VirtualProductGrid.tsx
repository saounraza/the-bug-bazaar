import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { Product } from '../../api/types';
import { ProductCard } from './ProductCard';

const MIN_CARD_WIDTH = 220;
const GAP = 16;
const ESTIMATED_ROW_HEIGHT = 340;
/** Start loading the next page when the last rendered row is this close to the end. */
const LOAD_AHEAD_ROWS = 3;

type VirtualProductGridProps = {
  products: Product[];
  listSearch?: string;
  hasMore: boolean;
  onEndReached: () => void;
  /** Ids currently rendered, so the live stock feed subscribes only to what is on screen. */
  onVisibleIdsChange?: (ids: string[]) => void;
};

/**
 * Performance (docs/performance.md, fix 1): only the rows near the viewport
 * exist in the DOM. With 3,000 products loaded that's ~30 cards instead of
 * 3,000, so a live stock update re-renders a handful of memoized cards.
 *
 * Keyboard: the grid is one Tab stop (roving tabindex). Arrow keys, Home and
 * End move between cards and scroll the target row into view, so keyboard
 * users can reach products that aren't rendered yet.
 */
export function VirtualProductGrid({
  products,
  listSearch,
  hasMore,
  onEndReached,
  onVisibleIdsChange,
}: VirtualProductGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const pendingFocus = useRef(false);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => {
      setWidth(element.clientWidth);
      setScrollMargin(element.getBoundingClientRect().top + window.scrollY);
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      // Old browsers and jsdom: fall back to window resizes.
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP)));
  const rowCount = Math.ceil(products.length / columns);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 2,
    scrollMargin,
    // jsdom and the first paint have no layout yet; render a first screenful anyway.
    initialRect: { width: 1024, height: 900 },
    // A row with no layout (jsdom, or display:none) would measure 0 px and make
    // every row "fit" on screen; fall back to the estimate instead.
    measureElement: (element) => element.getBoundingClientRect().height || ESTIMATED_ROW_HEIGHT,
  });
  const rows = virtualizer.getVirtualItems();

  // Infinite loading: ask for more when the rendered window nears the end.
  const lastRenderedRow = rows.at(-1)?.index ?? 0;
  useEffect(() => {
    if (hasMore && rowCount > 0 && lastRenderedRow >= rowCount - LOAD_AHEAD_ROWS) onEndReached();
  }, [hasMore, lastRenderedRow, rowCount, onEndReached]);

  // Report which products are on screen (by id), only when that set changes.
  const firstIndex = (rows[0]?.index ?? 0) * columns;
  const lastIndex = (lastRenderedRow + 1) * columns;
  const visibleKey = products
    .slice(firstIndex, lastIndex)
    .map((product) => product.id)
    .join(',');
  useEffect(() => {
    onVisibleIdsChange?.(visibleKey ? visibleKey.split(',') : []);
  }, [visibleKey, onVisibleIdsChange]);

  // Keep the active card valid when the list shrinks (new filters).
  const safeActive = Math.min(activeIndex, Math.max(0, products.length - 1));

  // After an arrow key, focus the new card once its row has rendered.
  useEffect(() => {
    if (!pendingFocus.current) return;
    const link = containerRef.current?.querySelector<HTMLElement>(
      `[data-card-index="${safeActive}"] a`,
    );
    if (link) {
      pendingFocus.current = false;
      link.focus({ preventScroll: true });
    }
  });

  const moveTo = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(0, index), products.length - 1);
      pendingFocus.current = true;
      setActiveIndex(next);
      virtualizer.scrollToIndex(Math.floor(next / columns), { align: 'auto' });
    },
    [columns, products.length, virtualizer],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: safeActive + 1,
      ArrowLeft: safeActive - 1,
      ArrowDown: safeActive + columns,
      ArrowUp: safeActive - columns,
      Home: event.ctrlKey ? 0 : safeActive - (safeActive % columns),
      End: event.ctrlKey
        ? products.length - 1
        : Math.min(products.length - 1, safeActive - (safeActive % columns) + columns - 1),
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    moveTo(target);
  };

  return (
    <div
      ref={containerRef}
      role="grid"
      tabIndex={-1}
      aria-label="Products"
      aria-rowcount={rowCount}
      aria-colcount={columns}
      aria-describedby="grid-help"
      data-total-loaded={products.length}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        // Clicking or tabbing onto a card makes it the active one.
        const index = event.target.closest<HTMLElement>('[data-card-index]')?.dataset.cardIndex;
        if (index !== undefined && Number(index) !== safeActive) setActiveIndex(Number(index));
      }}
    >
      <p id="grid-help" className="visually-hidden">
        Use the arrow keys to move between products, and Enter to open one.
      </p>
      <div role="rowgroup" className="vgrid" style={{ height: virtualizer.getTotalSize() }}>
        {rows.map((row) => {
          const start = row.index * columns;
          const rowProducts = products.slice(start, start + columns);
          return (
            <div
              key={row.key}
              role="row"
              aria-rowindex={row.index + 1}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="vgrid__row"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              }}
            >
              {rowProducts.map((product, offset) => {
                const index = start + offset;
                return (
                  <div
                    key={product.id}
                    role="gridcell"
                    aria-colindex={offset + 1}
                    data-card-index={index}
                  >
                    <ProductCard
                      product={product}
                      listSearch={listSearch}
                      tabIndex={index === safeActive ? 0 : -1}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {!hasMore && products.length > 0 && (
        <p className="hint">
          You&apos;ve reached the end: all {products.length.toLocaleString()} shown.
        </p>
      )}
    </div>
  );
}
