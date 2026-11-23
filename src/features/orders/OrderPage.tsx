import { Link, useParams } from 'react-router';
import type { OrderStatus } from '../../api/types';
import { NotFoundPage } from '../../app/NotFoundPage';
import { AsyncView } from '../../components/AsyncView';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { useGetOrderQuery } from './ordersApi';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'queued', label: 'Order received' },
  { status: 'processing', label: 'Payment and packing' },
  { status: 'confirmed', label: 'Confirmed' },
];

export const ORDER_POLL_MS = 1500;

export function OrderPage() {
  useDocumentTitle('Order confirmation');
  const { id = '' } = useParams();
  const query = useGetOrderQuery(id);
  const status = query.currentData?.status;

  // A second subscription to the same cache entry adds polling until the order
  // is confirmed. RTK Query stops polling when the page unmounts.
  useGetOrderQuery(id, {
    pollingInterval: status && status !== 'confirmed' ? ORDER_POLL_MS : 0,
    skip: !status,
  });

  return (
    <section className="page-narrow">
      <AsyncView
        state={toRequestState(query)}
        loadingLabel="Loading your order"
        skeleton={<div className="skeleton" style={{ height: 160 }} />}
        onRetry={() => void query.refetch()}
        notFound={<NotFoundPage what="order" />}
      >
        {(order) => {
          const current = STEPS.findIndex((step) => step.status === order.status);
          return (
            <>
              <h1 tabIndex={-1}>Thanks for your order!</h1>
              <p>
                Order number <strong>{order.id}</strong>
              </p>
              <ol className="order-steps" aria-label="Order progress">
                {STEPS.map((step, index) => (
                  <li
                    key={step.status}
                    className={index < current ? 'done' : undefined}
                    aria-current={index === current ? 'step' : undefined}
                  >
                    {step.label}
                  </li>
                ))}
              </ol>
              <p role="status">
                {order.status === 'confirmed'
                  ? 'Your order is confirmed. A receipt is on its way to your inbox.'
                  : 'We are processing your order. This page updates on its own.'}
              </p>
              <Link className="button button--secondary" to="/">
                Keep shopping
              </Link>
            </>
          );
        }}
      </AsyncView>
    </section>
  );
}
