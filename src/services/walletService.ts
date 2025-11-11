type ConnectionEventType = 'attempt' | 'success' | 'failure' | 'disconnect';

export interface ConnectionEvent {
  type: ConnectionEventType;
  providerName?: string;
  walletClientType?: string;
  errorMessage?: string;
  errorCode?: number | string;
  timestamp: number;
}

const STORAGE_KEY = 'connection_events';
const MAX_EVENTS = 200;

function readEvents(): ConnectionEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: ConnectionEvent[]) {
  try {
    const pruned = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // ignore storage errors
  }
}

export function logConnectionEvent(event: Omit<ConnectionEvent, 'timestamp'>) {
  const withTs: ConnectionEvent = { ...event, timestamp: Date.now() };
  const events = readEvents();
  events.push(withTs);
  writeEvents(events);
  // Also log to console for immediate diagnostics
  // eslint-disable-next-line no-console
  console.info('[connection]', withTs);
}

export function getConnectionEvents(): ConnectionEvent[] {
  return readEvents();
}

export function clearConnectionEvents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}