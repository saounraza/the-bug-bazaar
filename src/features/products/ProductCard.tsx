import { memo } from 'react';
import { Link } from 'react-router';
import type { Product } from '../../api/types';
import { Price } from '../../components/Price';
import { Rating } from '../../components/Rating';
import { StockBadge } from '../../components/StockBadge';

type ProductCardProps = {
  product: Product;
  /** Query string of the list, so the details page can link back to the same view. */
  listSearch?: string;
  /** Roving tabindex from the grid: only the active card is in the Tab order. */
  tabIndex?: number;
};

/**
 * Memoized (docs/performance.md, D4-3): a live stock update replaces one
 * product object in the cache (Immer keeps every other object identical), so
 * only the card whose product changed re-renders.
 */
export const ProductCard = memo(function ProductCard({
  product,
  listSearch = '',
  tabIndex,
}: ProductCardProps) {
  return (
    <article className="card">
      <img
        className="card__image"
        src={product.imageUrl}
        alt=""
        width={400}
        height={300}
        loading="lazy"
        decoding="async"
      />
      <div className="card__body">
        <h3 className="card__title">
          {/* The whole card is clickable through the link's ::after overlay. */}
          <Link
            className="card__link"
            to={`/products/${product.id}`}
            state={{ listSearch }}
            tabIndex={tabIndex}
          >
            {product.name}
          </Link>
        </h3>
        <div className="card__meta">
          <Price cents={product.price} />
          <Rating value={product.rating} />
        </div>
        <StockBadge stock={product.stock} />
      </div>
    </article>
  );
});
