import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import React from "react";

type SSEListener = (data: Record<string, unknown>) => void;
type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface SSEContextValue {
  connected: boolean;
  connectionStatus: ConnectionStatus;
  retryCount: number;
  subscribe: (event: string, listener: SSEListener) => () => void;
  reconnect: () => void;
}

const SSEContext = createContext<SSEContextValue>({
  connected: false,
  connectionStatus: "disconnected",
  retryCount: 0,
  subscribe: () => () => {},
  reconnect: () => {},
});

const BACKOFF_SCHEDULE = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000, 30000];
const MAX_RETRIES = BACKOFF_SCHEDULE.length;
const SEEN_SEQ_MAX = 1000;

const EVENT_TYPES = [
  "pipeline:created",
  "pipeline:update",
  "pipeline:done",
  "gate:waiting",
  "gate:resolved",
  "stage:log",
  "gateway:status",
];

export function SSEProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [retryCount, setRetryCount] = useState(0);
  const listenersRef = useRef(new Map<string, Set<SSEListener>>());
  const esRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const seenSeqRef = useRef(new Set<number>());
  const lastEventSeqRef = useRef(0);

  const subscribe = useCallback((event: string, listener: SSEListener) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(listener);
    return () => {
      listenersRef.current.get(event)?.delete(listener);
    };
  }, []);

  const notifyListeners = useCallback((eventType: string, data: Record<string, unknown>) => {
    // Dedup by seq (T018)
    const seq = data.seq as number | undefined;
    if (seq !== undefined) {
      if (seenSeqRef.current.has(seq)) return; // duplicate, skip
      seenSeqRef.current.add(seq);
      // Bound the set size
      if (seenSeqRef.current.size > SEEN_SEQ_MAX) {
        const iter = seenSeqRef.current.values();
        for (let i = 0; i < 200; i++) iter.next(); // skip first 200
        // Actually, simpler: just clear old entries
        const arr = [...seenSeqRef.current];
        seenSeqRef.current = new Set(arr.slice(-SEEN_SEQ_MAX + 200));
      }
      lastEventSeqRef.current = Math.max(lastEventSeqRef.current, seq);
    }

    const listeners = listenersRef.current.get(eventType);
    if (listeners) {
      for (const listener of listeners) listener(data);
    }
    const wildcardListeners = listenersRef.current.get("*");
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        listener({ ...data, _event: eventType });
      }
    }
  }, []);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const es = new EventSource("/api/events/stream");
    esRef.current = es;

    es.onopen = () => {
      setConnectionStatus("connected");
      retryCountRef.current = 0;
      setRetryCount(0);
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;

      if (retryCountRef.current >= MAX_RETRIES) {
        setConnectionStatus("disconnected");
        return;
      }

      setConnectionStatus("reconnecting");
      const delay = BACKOFF_SCHEDULE[retryCountRef.current] || BACKOFF_SCHEDULE[BACKOFF_SCHEDULE.length - 1];
      retryCountRef.current++;
      setRetryCount(retryCountRef.current);

      retryTimerRef.current = setTimeout(connect, delay);
    };

    for (const eventType of EVENT_TYPES) {
      es.addEventListener(eventType, (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          notifyListeners(eventType, data);
        } catch {
          // ignore parse errors
        }
      });
    }
  }, [notifyListeners]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    setRetryCount(0);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) esRef.current.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [connect]);

  return React.createElement(
    SSEContext.Provider,
    {
      value: {
        connected: connectionStatus === "connected",
        connectionStatus,
        retryCount,
        subscribe,
        reconnect,
      },
    },
    children
  );
}

export function useSSE() {
  return useContext(SSEContext);
}

export function useSSEEvent(event: string, handler: SSEListener) {
  const { subscribe } = useSSE();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return subscribe(event, (data) => handlerRef.current(data));
  }, [event, subscribe]);
}
