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

  // Keep callback reference updated without triggering re-renders
  useEffect(() => {
    callbackRef.current = onSyncCallback;
  }, [onSyncCallback]);

  useEffect(() => {
    const socket = getSocket();

    const handleDataUpdate = (data) => {
      if (data && data.module === moduleName) {
        // Trigger the provided callback to silently refresh data
        if (callbackRef.current) {
          callbackRef.current();
        }
      }
    };

    socket.on("data_updated", handleDataUpdate);

    return () => {
      socket.off("data_updated", handleDataUpdate);
    };
  }, [moduleName]);
};
