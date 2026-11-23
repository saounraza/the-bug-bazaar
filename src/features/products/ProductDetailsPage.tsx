import { Link, useLocation, useParams } from 'react-router';
import { NotFoundPage } from '../../app/NotFoundPage';
import { AsyncView } from '../../components/AsyncView';
import { Price } from '../../components/Price';
import { Rating } from '../../components/Rating';
import { StockBadge } from '../../components/StockBadge';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { useGetProductQuery } from './productsApi';

export function ProductDetailsPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? '';
  const query = useGetProductQuery(id);
  useDocumentTitle(query.currentData?.name ?? 'Product');

  return (
    <section>
      <Link className="back-link" to={{ pathname: '/', search: listSearch }}>
        ← Back to products
      </Link>
      <AsyncView
        state={toRequestState(query)}
        loadingLabel="Loading product"
        skeleton={<div className="skeleton skeleton--details" />}
        onRetry={() => void query.refetch()}
        notFound={<NotFoundPage what="product" />}
      >
        {(product) => (
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
        )}
      </AsyncView>
    </section>
  );
}
