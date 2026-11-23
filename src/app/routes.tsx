import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { AccountPage } from '../features/auth/AccountPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { CartPage } from '../features/cart/CartPage';
import { CheckoutPage } from '../features/orders/CheckoutPage';
import { OrderPage } from '../features/orders/OrderPage';
import { ProductDetailsPage } from '../features/products/ProductDetailsPage';
import { ProductListPage } from '../features/products/ProductListPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

const protect = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'products/:id', element: <ProductDetailsPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: protect(<CheckoutPage />) },
      { path: 'orders/:id', element: protect(<OrderPage />) },
      { path: 'login', element: <LoginPage /> },
      { path: 'account', element: protect(<AccountPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
