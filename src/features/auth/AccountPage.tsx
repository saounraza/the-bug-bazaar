import { useAppDispatch } from '../../app/hooks';
import { AsyncView } from '../../components/AsyncView';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { toRequestState } from '../../lib/queryState';
import { useGetMeQuery } from './authApi';
import { loggedOut } from './sessionSlice';

export function AccountPage() {
  useDocumentTitle('Your account');
  const dispatch = useAppDispatch();
  // Always asks the server: this is also how an expired token is discovered.
  const query = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });

  return (
    <section className="page-narrow">
      <h1 tabIndex={-1}>Your account</h1>
      <AsyncView
        state={toRequestState(query)}
        loadingLabel="Loading your account"
        skeleton={<div className="skeleton" style={{ height: 120 }} />}
        onRetry={() => void query.refetch()}
      >
        {(user) => (
          <div className="summary">
            <p className="summary__row">
              <span>Name</span> <strong>{user.name}</strong>
            </p>
            <p className="summary__row">
              <span>Email</span> <strong>{user.email}</strong>
            </p>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => dispatch(loggedOut())}
            >
              Sign out
            </button>
          </div>
        )}
      </AsyncView>
    </section>
  );
}
