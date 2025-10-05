import { useState, useEffect, useRef } from 'react';
import { buildWsUrl } from '@/utils/ws';

export type BackendStatus = 'connected' | 'disconnected' | 'connecting';

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const connect = () => {
      try {
        const wsUrl = buildWsUrl('/ws/live-recorder');
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setStatus('connected');
          reconnectAttemptsRef.current = 0;
        };

        wsRef.current.onclose = () => {
          setStatus('disconnected');
          
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        };

        wsRef.current.onerror = () => {
          setStatus('disconnected');
        };
      } catch {
        setStatus('disconnected');
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return status;
}
