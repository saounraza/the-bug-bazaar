import { useId, useSyncExternalStore } from 'react';
import { api } from '../../api/baseApi';
import { useAppDispatch } from '../../app/hooks';
import {
  ENDPOINTS,
  getChaos,
  resetChaos,
  setChaos,
  setForcedError,
  subscribeChaos,
  type EndpointKey,
} from '../../mocks/chaos';
import { resetDb, revokeAllSessions } from '../../mocks/db';
import { dropAllStockClients } from '../../mocks/stockSocket';
import { cartCleared } from '../cart/cartSlice';
import { mockControlEvents } from './mockControlEvents';

/**
 * Panel for triggering every documented error, latency and out-of-order
 * responses on purpose. Only loaded when the mock API is enabled.
 */
export default function MockControls() {
  const id = useId();
  const dispatch = useAppDispatch();
  const chaos = useSyncExternalStore(subscribeChaos, getChaos);

  return (
    <details className="devtools">
      <summary>
        <span aria-hidden="true">🐞</span> Mock controls
      </summary>
      <div className="devtools__panel">
        <fieldset>
          <legend>Network</legend>
          <div className="devtools__row">
            <label htmlFor={`${id}-latency`}>Latency: {chaos.latencyMs} ms</label>
            <input
              id={`${id}-latency`}
              type="range"
              min={0}
              max={3000}
              step={50}
              value={chaos.latencyMs}
              onChange={(event) => setChaos({ latencyMs: Number(event.target.value) })}
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={chaos.raceySearch}
              onChange={(event) => setChaos({ raceySearch: event.target.checked })}
            />
            Random search latency (out-of-order responses)
          </label>
        </fieldset>

        <fieldset>
          <legend>Force an error</legend>
          {(Object.keys(ENDPOINTS) as EndpointKey[]).map((endpoint) => (
            <div className="devtools__row" key={endpoint}>
              <label htmlFor={`${id}-${endpoint}`}>
                <code>{ENDPOINTS[endpoint].label}</code>
              </label>
              <select
                id={`${id}-${endpoint}`}
                value={chaos.forcedErrors[endpoint] ?? ''}
                onChange={(event) =>
                  setForcedError(
                    endpoint,
                    event.target.value ? Number(event.target.value) : undefined,
                  )
                }
              >
                <option value="">Normal</option>
                {ENDPOINTS[endpoint].statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={chaos.failAfterCommit}
              onChange={(event) => setChaos({ failAfterCommit: event.target.checked })}
            />
            Orders: save, then fail with 500 (lost response)
          </label>
        </fieldset>

        <fieldset>
          <legend>Actions</legend>
          <div className="devtools__actions">
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={revokeAllSessions}
            >
              Expire all sessions
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={dropAllStockClients}
            >
              Drop live connection
            </button>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => mockControlEvents.emit('throw-render-error')}
            >
              Throw a render error
            </button>
            <button
              type="button"
              className="button button--danger button--small"
              onClick={() => {
                resetChaos();
                resetDb({ wipe: true });
                dispatch(cartCleared());
                dispatch(api.util.resetApiState());
              }}
            >
              Reset everything
            </button>
          </div>
        </fieldset>
      </div>
    </details>
  );
}
