type StockBadgeProps = { stock: number };

export const LOW_STOCK = 5;

export function StockBadge({ stock }: StockBadgeProps) {
  if (stock <= 0) return <span className="badge badge--out">Out of stock</span>;
  if (stock <= LOW_STOCK) return <span className="badge badge--low">Only {stock} left</span>;
  return <span className="badge badge--in">{stock} in stock</span>;
}
