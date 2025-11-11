import { useEffect, useRef, useState } from "react";
import { useGeoClickStore } from "./geo-clicks-store";
import { durableObjectGeoClickArraySchema } from "@repo/data-ops/zod-schema/links";

const MAX_RETRIES = 5;

export function useClickSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const { addClicks } = useGeoClickStore();

  useEffect(() => {
    const connect = () => {
      const protocol = import.meta.env.PROD ? "wss:" : "ws:";
      const socket = new WebSocket(
        `${protocol}//${import.meta.env.VITE_BASE_HOST}/click-socket`,
      );

      socket.onopen = () => {
        setIsConnected(true);
        retryCountRef.current = 0;
      };

      socket.onmessage = (event) => {
        const data = durableObjectGeoClickArraySchema.parse(
          JSON.parse(event.data),
        );
        addClicks(data);
      };

      socket.onerror = (error) => {
        console.log("Socket Error", error);
      };

      socket.onclose = () => {
        setIsConnected(false);

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.current = socket;
    };

    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { isConnected };
}
