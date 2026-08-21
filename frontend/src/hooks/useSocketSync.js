import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

let globalSocket = null;

export const getSocket = () => {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
  }
  return globalSocket;
};

export const useSocketSync = (moduleName, onSyncCallback) => {
  const callbackRef = useRef(onSyncCallback);
  const debounceTimerRef = useRef(null);

  // Keep callback reference updated without triggering re-renders
  useEffect(() => {
    callbackRef.current = onSyncCallback;
  }, [onSyncCallback]);

  useEffect(() => {
    const socket = getSocket();

    const handleDataUpdate = (data) => {
      if (data && data.module === moduleName) {
        // Debounce multiple rapid socket updates to batch into a single background fetch
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          if (callbackRef.current) {
            callbackRef.current();
          }
        }, 500);
      }
    };

    socket.on("data_updated", handleDataUpdate);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      socket.off("data_updated", handleDataUpdate);
    };
  }, [moduleName]);
};
