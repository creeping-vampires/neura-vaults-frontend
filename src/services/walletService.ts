type ConnectionEventType = 'attempt' | 'success' | 'failure' | 'disconnect';

export interface ConnectionEvent {
  type: ConnectionEventType;
  providerName?: string;
  walletClientType?: string;
  errorMessage?: string;
  errorCode?: number | string;
  timestamp: number;
}

const STORAGE_KEY = 'connection_events'; // Unused
const MAX_EVENTS = 200;

// In-memory storage only
let eventsCache: ConnectionEvent[] = [];

function readEvents(): ConnectionEvent[] {
  return [...eventsCache];
}

function writeEvents(events: ConnectionEvent[]) {
  const pruned = events.slice(-MAX_EVENTS);
  eventsCache = pruned;
}

export function logConnectionEvent(event: Omit<ConnectionEvent, 'timestamp'>) {
  const withTs: ConnectionEvent = { ...event, timestamp: Date.now() };
  const events = readEvents();
  events.push(withTs);
  writeEvents(events);
  console.info('[connection]', withTs);
}

export function getConnectionEvents(): ConnectionEvent[] {
  return readEvents();
}

export function clearConnectionEvents() {
  eventsCache = [];
}