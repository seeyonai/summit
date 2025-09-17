import type { WebSocketMessage } from '../hooks/useWebSocket';

export interface WebSocketServiceOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectCount = 0;
  private reconnectTimeout: number | null = null;
  private options: WebSocketServiceOptions;

  constructor(options: WebSocketServiceOptions) {
    this.options = options;
  }

  connect(): void {
    try {
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => {
        this.reconnectCount = 0;
        this.options.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.options.onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        this.options.onClose?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        this.options.onError?.(error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  private attemptReconnect(): void {
    const { reconnectAttempts = 5, reconnectInterval = 3000 } = this.options;
    
    if (this.reconnectCount < reconnectAttempts) {
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectCount++;
        this.connect();
      }, reconnectInterval);
    }
  }

  sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}