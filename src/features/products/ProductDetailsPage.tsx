import { Link, useLocation, useParams } from 'react-router';
import { Price } from '../../components/Price';
import { Rating } from '../../components/Rating';
import { StockBadge } from '../../components/StockBadge';
import { useGetProductQuery } from './productsApi';

export function ProductDetailsPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? '';
  const { currentData: product, isError } = useGetProductQuery(id);

  return (
    <section>
      <Link className="back-link" to={{ pathname: '/', search: listSearch }}>
        ← Back to products
      </Link>
      {isError && <p role="alert">Could not load this product.</p>}
      {!product && !isError && <p>Loading product…</p>}
      {product && (
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
    </section>
  );
}
