import { Link, useLocation, useParams } from 'react-router';
import type { Product } from '../../api/types';
import { NotFoundPage } from '../../app/NotFoundPage';
import { AsyncView } from '../../components/AsyncView';
import { BackToTop } from '../../components/BackToTop';
import { Price } from '../../components/Price';
import { Rating } from '../../components/Rating';
import { StockBadge } from '../../components/StockBadge';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { ProductGrid } from './ProductGrid';
import { useGetProductsInfiniteQuery } from './productsApi';
import { adjacentProductId, useProductDetails } from './useProductDetails';

type LinkState = { listSearch?: string } | null;

function RelatedProducts({ product }: { product: Product }) {
  const { currentData } = useGetProductsInfiniteQuery({
    search: '',
    category: product.category,
    sort: 'rating-desc',
    inStock: true,
  });
  const related = (currentData?.pages[0]?.items ?? [])
    .filter((item) => item.id !== product.id)
    .slice(0, 8);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="related">
      <h2 id="related-heading">Top rated in {product.category}</h2>
      <ProductGrid products={related} label="Related products" />
    </section>
  );
}

export function ProductDetailsPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const listSearch = (location.state as LinkState)?.listSearch ?? '';
  const query = useProductDetails(id);
  useDocumentTitle(query.currentData?.name ?? 'Product');

  const previousId = adjacentProductId(id, -1);
  const nextId = adjacentProductId(id, 1);

  return (
    <section>
      <Link className="back-link" to={{ pathname: '/', search: listSearch }}>
        ← Back to products
      </Link>
      <AsyncView
        state={toRequestState(query)}
        loadingLabel="Loading product"
        skeleton={<div className="skeleton skeleton--details" />}
        onRetry={query.refetch}
        notFound={<NotFoundPage what="product" />}
      >
        {(product) => (
          <>
            <article className="details">
              <img
                className="details__image"
                src={product.imageUrl}
                alt={product.name}
                width={400}
                height={300}
              />
              <div className="details__info">
                <p className="details__category">{product.category}</p>
                <h1 tabIndex={-1}>{product.name}</h1>
                <Price cents={product.price} className="price price--large" />
                <Rating value={product.rating} />
                <StockBadge stock={product.stock} />
              </div>
            </article>
            <RelatedProducts product={product} />
          </>
        )}
      </AsyncView>
      <nav className="pager" aria-label="Browse products">
        {previousId ? (
          <Link to={`/products/${previousId}`} state={{ listSearch }}>
            ← Previous product
          </Link>
        ) : (
          <span />
        )}
        {nextId && (
          <Link to={`/products/${nextId}`} state={{ listSearch }}>
            Next product →
          </Link>
        )}
      </nav>
      <BackToTop />
    </section>
  );
}
