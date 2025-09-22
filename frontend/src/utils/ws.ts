export function buildWsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window === 'undefined') {
    return `ws://localhost:2591${normalizedPath}`;
  }

  const isDev = (import.meta as any)?.env?.DEV || window.location.port === '2590';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = isDev ? `${window.location.hostname}:2591` : window.location.host;

  return `${protocol}//${host}${normalizedPath}`;
}

 