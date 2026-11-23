import { useCallback, useState } from 'react';
import { useLocation } from 'react-router';
import { AsyncView } from '../../components/AsyncView';
import { BackToTop } from '../../components/BackToTop';
import { EmptyState, GridSkeleton } from '../../components/StatusViews';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { FilterBar } from './FilterBar';
import { LiveStatus } from './LiveStatus';
import { useGetProductsInfiniteQuery } from './productsApi';
import { useProductFilters } from './useProductFilters';
import { useStockFeed } from './useStockFeed';
import { VirtualProductGrid } from './VirtualProductGrid';

function resultLabel(total: number, search: string): string {
  const count = `${total.toLocaleString()} ${total === 1 ? 'result' : 'results'}`;
  return search ? `${count} for “${search}”` : count;
}

export function ProductListPage() {
  useDocumentTitle('Shop');
  const { search: listSearch } = useLocation();
  const { filters, updateFilters, clearFilters, isFiltered } = useProductFilters();
  const query = useGetProductsInfiniteQuery(filters);
  const { hasNextPage, fetchNextPage, isFetchingNextPage, refetch } = query;

  // Live stock only for the products actually on screen.
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const liveStatus = useStockFeed(visibleIds);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, isFetchingNextPage]);

  return (
    <section>
      <h1 tabIndex={-1}>Shop developer gear</h1>
      <FilterBar
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        isFiltered={isFiltered}
      />
      <AsyncView
        state={toRequestState(query)}
        loadingLabel="Loading products"
        skeleton={<GridSkeleton />}
        onRetry={() => void refetch()}
        isEmpty={(data) => (data.pages[0]?.total ?? 0) === 0}
        empty={
          <EmptyState
            title="No products match"
            message="Try a different search, or clear the filters to see everything."
            action={
              <button type="button" className="button" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        }
      >
        {(data) => (
          <>
            <div className="toolbar">
              <p className="result-count" role="status">
                {resultLabel(data.pages[0]?.total ?? 0, filters.search.trim())}
              </p>
              <LiveStatus status={liveStatus} />
            </div>
            <VirtualProductGrid
              products={data.pages.flatMap((page) => page.items)}
              listSearch={listSearch}
              hasMore={hasNextPage}
              onEndReached={loadMore}
              onVisibleIdsChange={setVisibleIds}
            />
            {isFetchingNextPage && (
              <p className="hint" role="status">
                Loading more products…
              </p>
            )}
          </>
        )}
      </AsyncView>
      <BackToTop />
    </section>
  );
}
