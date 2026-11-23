import { useGetProductsInfiniteQuery, type ProductFilters } from './productsApi';
import { ProductGrid } from './ProductGrid';

const DEFAULT_FILTERS: ProductFilters = {
  search: '',
  category: null,
  sort: 'featured',
  inStock: false,
};

export function ProductListPage() {
  const { currentData, isError, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useGetProductsInfiniteQuery(DEFAULT_FILTERS);

  const products = currentData?.pages.flatMap((page) => page.items) ?? [];
  const total = currentData?.pages[0]?.total ?? 0;

  return (
    <section>
      <h1 tabIndex={-1}>Shop developer gear</h1>
      {isError && (
        <p role="alert">
          Could not load products. <button onClick={() => void refetch()}>Try again</button>
        </p>
      )}
      {!currentData && !isError && <p>Loading products…</p>}
      {currentData && (
        <>
          <p className="result-count">{total.toLocaleString()} products</p>
          <ProductGrid products={products} />
          {hasNextPage && (
            <button
              className="button"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
