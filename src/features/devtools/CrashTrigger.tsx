import { useEffect, useState } from 'react';
import { mockControlEvents } from './mockControlEvents';

/**
 * Renders nothing until Mock controls → "Throw a render error" is clicked,
 * then throws during render so the error boundary can be seen working.
 */
export function CrashTrigger() {
  const [crash, setCrash] = useState(false);
  useEffect(() => mockControlEvents.on('throw-render-error', () => setCrash(true)), []);
  if (crash) throw new Error('Test crash from Mock controls');
  return null;
}
