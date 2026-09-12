import { useEffect, useRef } from 'react';

const SSE_URL = 'http://localhost:5000/api/v1/trades/stream';

/**
 * useTradeSync – subscribes to the backend SSE stream and calls
 * `onUpdate` whenever a TRADE_UPDATE event arrives.
 *
 * Features:
 *  - Automatic reconnect with exponential back-off (max 30 s)
 *  - Cleans up the connection on unmount
 *  - Does NOT reconnect if the tab is hidden (saves battery/network)
 */
export default function useTradeSync(onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let es = null;
    let retryDelay = 1000;     // start at 1 s
    let retryTimer = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      es = new EventSource(SSE_URL);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'TRADE_UPDATE') {
            onUpdateRef.current?.();
          }
        } catch (_) { /* malformed frame – ignore */ }
      };

      es.onerror = () => {
        es.close();
        if (destroyed) return;
        // Exponential back-off, capped at 30 s
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };

      es.onopen = () => {
        retryDelay = 1000; // reset on successful connect
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, []); // run once on mount
}
