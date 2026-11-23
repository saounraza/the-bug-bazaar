import type { RouteObject } from 'react-router';
import { ProductDetailsPage } from '../features/products/ProductDetailsPage';
import { ProductListPage } from '../features/products/ProductListPage';
import { Layout } from './Layout';
import { NotFoundPage } from './NotFoundPage';

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'products/:id', element: <ProductDetailsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
