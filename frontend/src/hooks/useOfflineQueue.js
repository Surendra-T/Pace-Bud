import { useEffect, useState, useCallback } from 'react';
import { get, set } from 'idb-keyval';
import { uploadFieldLog } from '../api/client';

const QUEUE_KEY = 'pacebud_offline_field_logs';

export function useOfflineQueue(currentRunId) {
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load initial queue from IndexedDB
  useEffect(() => {
    get(QUEUE_KEY).then((items) => {
      if (items && Array.isArray(items)) {
        setQueue(items);
      }
    });
  }, []);

  // Save to IndexedDB whenever queue updates
  const updateQueue = useCallback(async (newQueue) => {
    setQueue(newQueue);
    await set(QUEUE_KEY, newQueue);
  }, []);

  // Sync queued items with server
  const processQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    const currentQueue = (await get(QUEUE_KEY)) || [];
    if (currentQueue.length === 0) return;

    setIsSyncing(true);
    const remaining = [];

    for (const item of currentQueue) {
      try {
        await uploadFieldLog(item.runId, item.clientId, item.audioBlob, item.text);
      } catch (err) {
        console.warn('Sync failed for item, keeping in queue:', item.clientId, err);
        remaining.push(item);
      }
    }

    await set(QUEUE_KEY, remaining);
    setQueue(remaining);
    setIsSyncing(false);
  }, [isSyncing]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  // Enqueue a field log (audio or text)
  const enqueueFieldLog = async (clientId, audioBlob, text, runId) => {
    const targetRunId = runId || currentRunId;
    const item = {
      clientId,
      runId: targetRunId,
      audioBlob,
      text,
      timestamp: Date.now(),
    };

    if (navigator.onLine) {
      try {
        await uploadFieldLog(targetRunId, clientId, audioBlob, text);
        return { enqueued: false, synced: true };
      } catch (err) {
        console.warn('Network request failed, falling back to offline queue:', err);
      }
    }

    // Add to IndexedDB
    const existing = (await get(QUEUE_KEY)) || [];
    const updated = [...existing, item];
    await updateQueue(updated);
    return { enqueued: true, synced: false };
  };

  return {
    queue,
    isOnline,
    isSyncing,
    enqueueFieldLog,
    processQueue,
  };
}
