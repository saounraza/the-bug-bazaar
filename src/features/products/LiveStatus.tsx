import type { FeedStatus } from '../../api/stockFeed';

const LABELS: Record<FeedStatus, string> = {
  connecting: 'Connecting to live stock…',
  open: 'Live stock',
  reconnecting: 'Reconnecting to live stock…',
  closed: 'Live stock paused',
};

export function LiveStatus({ status }: { status: FeedStatus }) {
  return (
    <span className={`live-status live-status--${status}`} role="status">
      <span className="live-status__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
