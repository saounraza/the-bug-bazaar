import { Link } from 'react-router';

type NotFoundPageProps = { what?: string };

export function NotFoundPage({ what = 'page' }: NotFoundPageProps) {
  return (
    <section className="status status--centered">
      <p className="status__icon" aria-hidden="true">
        🦆
      </p>
      <h1 tabIndex={-1}>We couldn&apos;t find that {what}</h1>
      <p>
        Even the debugging duck looked everywhere. It may have been removed or the link is wrong.
      </p>
      <Link className="button" to="/">
        Back to the shop
      </Link>
    </section>
  );
}
