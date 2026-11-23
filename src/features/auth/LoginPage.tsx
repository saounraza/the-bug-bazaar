import { useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { describeError, fieldMessage, isAppError, type AppError } from '../../api/errors';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLoginMutation } from './authApi';
import type { ReturnToState } from './RequireAuth';
import { loggedIn, noticeDismissed, selectIsAuthenticated, selectSession } from './sessionSlice';

type Field = 'email' | 'password';

function returnPath(state: unknown): string {
  const from = (state as ReturnToState | null)?.from;
  if (!from || from.pathname === '/login') return '/account';
  return `${from.pathname}${from.search}${from.hash}`;
}

export function LoginPage() {
  useDocumentTitle('Sign in');
  const id = useId();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const session = useAppSelector(selectSession);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState<AppError | null>(null);
  // A ref flips synchronously, so a fast double click or double Enter is
  // rejected even before React re-renders the disabled button.
  const inFlight = useRef(false);
  const fieldRefs = {
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  // Already signed in (or just signed in): go back to where the user came from.
  if (isAuthenticated) {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  const fieldErrors = error?.kind === 'validation' ? error.fields : {};
  const notice = session.status === 'anonymous' ? session.notice : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    try {
      const result = await login({
        email: values.email.trim(),
        password: values.password,
      }).unwrap();
      // The redirect above runs on the next render, once the session is set.
      dispatch(loggedIn(result));
    } catch (caught) {
      const appError: AppError = isAppError(caught) ? caught : { kind: 'server', status: 0 };
      setError(appError);
      if (appError.kind === 'validation') {
        const first = (['email', 'password'] as const).find((field) => appError.fields[field]);
        if (first) fieldRefs[first].current?.focus();
      }
    } finally {
      inFlight.current = false;
    }
  }

  const describedBy = (field: Field) =>
    fieldErrors[field] ? `${id}-${field}-error` : `${id}-${field}-hint`;

  return (
    <section className="page-narrow">
      <h1 tabIndex={-1}>Sign in</h1>

      {notice === 'expired' && (
        <div className="alert alert--warn" role="status">
          <span className="alert__title">Your session expired</span>
          <p>Sign in again and we will take you back to where you were.</p>
        </div>
      )}

      <form className="form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        {/* Announced by screen readers as soon as it appears. */}
        <div role="alert">
          {error && error.kind !== 'validation' && (
            <div className="alert">
              <span className="alert__title">{describeError(error).title}</span>
              <p>{describeError(error).message}</p>
            </div>
          )}
          {error?.kind === 'validation' && (
            <p className="visually-hidden">
              {Object.entries(fieldErrors)
                .map(([field, code]) => `${field}: ${fieldMessage(code)}`)
                .join(' ')}
            </p>
          )}
        </div>

        {(['email', 'password'] as const).map((field) => (
          <div className="field" key={field}>
            <label htmlFor={`${id}-${field}`}>{field === 'email' ? 'Email' : 'Password'}</label>
            <input
              ref={fieldRefs[field]}
              id={`${id}-${field}`}
              name={field}
              type={field}
              autoComplete={field === 'email' ? 'email' : 'current-password'}
              value={values[field]}
              aria-invalid={fieldErrors[field] ? true : undefined}
              aria-describedby={describedBy(field)}
              onChange={(event) => {
                setValues((current) => ({ ...current, [field]: event.target.value }));
                if (notice) dispatch(noticeDismissed());
              }}
            />
            {fieldErrors[field] ? (
              <p className="field__error" id={`${id}-${field}-error`}>
                {fieldMessage(fieldErrors[field])}
              </p>
            ) : (
              <p className="hint" id={`${id}-${field}-hint`}>
                {field === 'email' ? 'Demo: demo@bugbazaar.dev' : 'Demo: password123'}
              </p>
            )}
          </div>
        ))}

        <button type="submit" className="button" disabled={isLoading} aria-disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
