const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Formats an integer number of cents for display: 2499 -> "$24.99".
 * Arithmetic always stays in integer cents (see `sumCents`); dividing by 100
 * happens only here, at the edge, where float precision can't accumulate.
 */
export function formatPrice(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error(`Price must be integer cents, got ${cents}`);
  return usd.format(cents / 100);
}

export function lineTotal(unitCents: number, quantity: number): number {
  return unitCents * quantity;
}
