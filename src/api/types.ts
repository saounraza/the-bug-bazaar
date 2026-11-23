/**
 * Types for the shared API contract (docs/api-contract.md).
 * Every request and response in the app is typed from this file, and the mock
 * backend imports the same types, so the two sides cannot drift apart silently.
 */

export const CATEGORIES = ['keyboards', 'ducks', 'coffee', 'stickers'] as const;
export type Category = (typeof CATEGORIES)[number];

export type Product = {
  id: string;
  name: string;
  /** Price in cents. Never store or do arithmetic on currency as floats. */
  price: number;
  category: Category;
  stock: number;
  rating: number;
  imageUrl: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
};

export const SORT_OPTIONS = [
  'featured',
  'price-asc',
  'price-desc',
  'rating-desc',
  'name-asc',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Query for GET /api/products. `inStock` and `pageSize` are documented extensions. */
export type ProductQuery = {
  search?: string;
  category?: Category;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  inStock?: boolean;
};

export type ProductPage = {
  items: Product[];
  total: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type OrderLine = {
  productId: string;
  quantity: number;
};

export type CreateOrderRequest = {
  items: OrderLine[];
};

export type OrderStatus = 'queued' | 'processing' | 'confirmed';

export type Order = {
  id: string;
  status: OrderStatus;
};

/** Machine-readable error codes the backend can return in `error.code`. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'INTERNAL_ERROR';

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export function isSortOption(value: unknown): value is SortOption {
  return typeof value === 'string' && (SORT_OPTIONS as readonly string[]).includes(value);
}

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
