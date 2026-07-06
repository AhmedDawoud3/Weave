import { useEffect, useRef, useState } from 'react';
import { useTrainingStore } from '../store/useTrainingStore';
import { api } from '../services/api';

export function useTrainingSSE(runId: string | null) {
  const store = useTrainingStore();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (!runId) {
      setConnectionStatus('disconnected');
      store.setConnectionState('disconnected');
      return;
    }

    const activeRunId = runId;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionStatus('connecting');
      store.setConnectionState('connecting');
      store.addLog(`[SSE] Connecting to training metrics stream for run ${activeRunId}...`);

      const url = `${import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000'}/training/stream/${activeRunId}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('connected');
        store.setConnectionState('connected');
        store.addLog('[SSE] Stream connected successfully.');
        reconnectAttemptRef.current = 0; // reset retry counter
      };

      es.onerror = (err) => {
        console.error('SSE connection error:', err);
        setConnectionStatus('error');
        store.setConnectionState('error');
        store.addLog('[SSE] Connection lost or failed. Attempting to check status and reconnect...');
        es.close();

        // Check if training has actually stopped/finished in the background
        api.engine.getTrainingStatus(activeRunId)
          .then((statusRes) => {
            if (statusRes.status === 'completed' || statusRes.status === 'stopped') {
              store.completeTraining(statusRes.current_epoch || 0, statusRes.latest_metrics?.val_loss ?? 0);
              return; // No need to reconnect
            } else if (statusRes.status === 'failed') {
              store.failTraining(statusRes.latest_metrics?.error || 'Engine error');
              return; // No need to reconnect
            }
            // If it's still running, schedule reconnect with backoff
            scheduleReconnect();
          })
          .catch(() => {
            // Network issue or server down, schedule reconnect
            scheduleReconnect();
          });
      };

      es.addEventListener('setup_status', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          store.addLog(`[Setup] ${parsed.message}`);
        } catch (e) {
          console.error('Failed to parse SSE setup_status:', e);
        }
      });

      es.addEventListener('step_metrics', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          store.addStepMetric({ type: 'step_metrics', ...parsed });
        } catch (e) {
          console.error('Failed to parse SSE step_metrics:', e);
        }
      });

      es.addEventListener('epoch_metrics', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          store.addEpochMetric({ type: 'epoch_metrics', ...parsed });
        } catch (e) {
          console.error('Failed to parse SSE epoch_metrics:', e);
        }
      });

      es.addEventListener('training_complete', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          store.completeTraining(parsed.best_epoch || 0, parsed.best_val_loss || 0);
          es.close();
        } catch (e) {
          console.error('Failed to parse SSE training_complete:', e);
        }
      });

      es.addEventListener('training_failed', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          store.failTraining(parsed.error || 'Engine error');
          es.close();
        } catch (e) {
          console.error('Failed to parse SSE training_failed:', e);
        }
      });
    }

    function scheduleReconnect() {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 10000);
      reconnectAttemptRef.current += 1;
      
      console.log(`Scheduling SSE reconnect in ${delay}ms...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [runId]);

  return { connectionStatus };
}
