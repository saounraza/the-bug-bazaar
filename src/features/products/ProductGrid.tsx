import type { Product } from '../../api/types';
import { ProductCard } from './ProductCard';

type ProductGridProps = { products: Product[]; listSearch?: string };

export function ProductGrid({ products, listSearch }: ProductGridProps) {
  return (
    <ul className="grid" aria-label="Products">
      {products.map((product) => (
        <li key={product.id} className="grid__item">
          <ProductCard product={product} listSearch={listSearch} />
        </li>
      ))}
    </ul>
  );
}
