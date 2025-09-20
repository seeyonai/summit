export type RecordingPanelEventType = 'open' | 'close' | 'start' | 'stop';

export interface RecordingPanelEvent {
  type: RecordingPanelEventType;
  payload?: unknown;
}

type Listener = (event: RecordingPanelEvent) => void;

const listeners = new Set<Listener>();

function emit(event: RecordingPanelEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      // no-op: isolate listener errors
    }
  });
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function open(): void {
  emit({ type: 'open' });
}

export function close(): void {
  emit({ type: 'close' });
}

export function start(payload?: unknown): void {
  emit({ type: 'start', payload });
}

export function stop(): void {
  emit({ type: 'stop' });
}

export const recordingPanelBus = {
  subscribe,
  open,
  close,
  start,
  stop,
};

