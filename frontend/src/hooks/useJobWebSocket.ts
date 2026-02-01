import { useEffect, useRef, useCallback } from 'react';
import { Job } from '../services/api';

export interface ProgressData {
  view: 'rear' | 'side';
  step: number;
  total_steps: number;
  percentage: number;
  message?: string;
}

interface WebSocketMessage {
  type: string;
  job?: Job;
  job_id?: string;
  progress?: ProgressData;
  message?: string;
}

interface UseJobWebSocketOptions {
  onJobUpdate: (job: Job) => void;
  onProgressUpdate?: (jobId: string, progress: ProgressData) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Custom hook for WebSocket connection to receive real-time job updates.
 * Automatically handles connection, reconnection, and message parsing.
 */
export function useJobWebSocket({ onJobUpdate, onProgressUpdate, onError, onConnect, onDisconnect }: UseJobWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('[WebSocket] No auth token, skipping connection');
      return;
    }

    // Determine WebSocket protocol (ws:// or wss://)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '8000'; // Django server port
    const wsUrl = `${protocol}//${host}:${port}/ws/jobs/?token=${token}`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data);

          if (data.type === 'job_update' && data.job) {
            onJobUpdate(data.job);
          } else if (data.type === 'progress_update' && data.job_id && data.progress) {
            onProgressUpdate?.(data.job_id, data.progress);
          } else if (data.type === 'connection_established') {
            console.log('[WebSocket] Connection established:', data.message);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        onDisconnect?.();
        wsRef.current = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('[WebSocket] Max reconnection attempts reached. Falling back to polling.');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }, [onJobUpdate, onProgressUpdate, onError, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('[WebSocket] Closing connection');
      wsRef.current.close(1000, 'Component unmounting'); // Normal closure
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
    reconnect: connect
  };
}
