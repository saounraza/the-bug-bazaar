import { useLocation } from 'react-router';
import { AsyncView } from '../../components/AsyncView';
import { EmptyState, GridSkeleton } from '../../components/StatusViews';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { FilterBar } from './FilterBar';
import { ProductGrid } from './ProductGrid';
import { useGetProductsInfiniteQuery } from './productsApi';
import { useProductFilters } from './useProductFilters';

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
            </div>
            <ProductGrid
              products={data.pages.flatMap((page) => page.items)}
              listSearch={listSearch}
            />
            {hasNextPage && (
              <button
                type="button"
                className="button"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </AsyncView>
    </section>
  );
}
