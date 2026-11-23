import type { Product } from '../../api/types';
import { ProductCard } from './ProductCard';

type ProductGridProps = { products: Product[]; listSearch?: string; label?: string };

export function ProductGrid({ products, listSearch, label = 'Products' }: ProductGridProps) {
  return (
    <ul className="grid" aria-label={label}>
      {products.map((product) => (
        <li key={product.id} className="grid__item">
          <ProductCard product={product} listSearch={listSearch} />
        </li>
      ))}
    </ul>
  );
}
