import { AsyncView } from '../../components/AsyncView';
import { EmptyState, GridSkeleton } from '../../components/StatusViews';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { ProductGrid } from './ProductGrid';
import { useGetProductsInfiniteQuery, type ProductFilters } from './productsApi';

const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  category: null,
  sort: 'featured',
  inStock: false,
};

export function ProductListPage() {
  useDocumentTitle('Shop');
  const query = useGetProductsInfiniteQuery(DEFAULT_FILTERS);
  const { hasNextPage, fetchNextPage, isFetchingNextPage, refetch } = query;

  return (
    <section>
      <h1 tabIndex={-1}>Shop developer gear</h1>
      <AsyncView
        state={toRequestState(query)}
        loadingLabel="Loading products"
        skeleton={<GridSkeleton />}
        onRetry={() => void refetch()}
        isEmpty={(data) => (data.pages[0]?.total ?? 0) === 0}
        empty={<EmptyState title="No products found" message="Try a different search or filter." />}
      >
        {(data) => (
          <>
            <p className="result-count" aria-live="polite">
              {(data.pages[0]?.total ?? 0).toLocaleString()} products
            </p>
            <ProductGrid products={data.pages.flatMap((page) => page.items)} />
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
