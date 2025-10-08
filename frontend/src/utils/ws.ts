export function buildWsUrl(
  path: string,
  params?: Record<string, string | undefined>
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const search = params
    ? (() => {
        const entries = Object.entries(params).filter(
          ([, value]) => typeof value === 'string' && value !== ''
        );
        if (entries.length === 0) {
          return '';
        }
        const query = new URLSearchParams(
          entries as Array<[string, string]>
        ).toString();
        return query ? `?${query}` : '';
      })()
    : '';

  if (typeof window === 'undefined') {
    return `ws://localhost:2591${normalizedPath}${search}`;
  }

  const isDev = (import.meta as { env?: { DEV?: boolean } })?.env?.DEV || window.location.port === '2590';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = isDev ? `${window.location.hostname}:2591` : window.location.host;

  return `${protocol}//${host}${normalizedPath}${search}`;
}

 
