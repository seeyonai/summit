export const isDebug: boolean = (process.env.LOG_LEVEL || '').toLowerCase() === 'debug';

export function debug(...args: unknown[]): void {
  if (isDebug) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function debugWarn(...args: unknown[]): void {
  if (isDebug) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

