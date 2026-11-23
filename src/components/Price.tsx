import { formatPrice } from '../lib/money';

type PriceProps = { cents: number; className?: string };

export function Price({ cents, className }: PriceProps) {
  return <span className={className ?? 'price'}>{formatPrice(cents)}</span>;
}
