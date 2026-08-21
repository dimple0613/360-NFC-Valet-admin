import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

let globalSocket = null;

function getSocket(token) {
  if (!WS_URL) return null;
  if (globalSocket && globalSocket.connected) return globalSocket;
  if (globalSocket) {
    globalSocket.disconnect();
  }
  globalSocket = io(WS_URL, {
    auth: { token, role: "admin" },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  globalSocket.on("connect", () => {
    console.log("[WS] Connected:", globalSocket.id);
  });
  globalSocket.on("disconnect", (reason) => {
    console.log("[WS] Disconnected:", reason);
  });
  globalSocket.on("connect_error", (err) => {
    console.log("[WS] Connection error:", err.message);
  });
  return globalSocket;
}

export function useSocket(events = {}, poll) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (!WS_URL) return;
    let token = null;
    try {
      const match = document.cookie.match(/session=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    } catch {}

    const socket = getSocket(token);
    if (!socket) return;
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    if (socket.connected) setConnected(true);

    const listeners = new Map();
    const updateListeners = () => {
      const current = eventsRef.current;
      for (const [event, handler] of Object.entries(current)) {
        if (!listeners.has(event)) {
          const wrapped = (data) => {
            try { eventsRef.current[event]?.(data); } catch (err) { console.error(`[WS] Error in handler for ${event}:`, err); }
          };
          socket.on(event, wrapped);
          listeners.set(event, wrapped);
        }
      }
      for (const [event, wrapped] of listeners) {
        if (!(event in current)) {
          socket.off(event, wrapped);
          listeners.delete(event);
        }
      }
    };
    updateListeners();

    return () => {
      for (const [, wrapped] of listeners) {
        const evt = [...listeners.entries()].find(([, w]) => w === wrapped)?.[0];
        if (evt) socket.off(evt, wrapped);
      }
      listeners.clear();
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  useEffect(() => {
    if (WS_URL && connected) return;
    if (!pollRef.current) return;
    const t = setInterval(() => pollRef.current?.(), 20000);
    return () => clearInterval(t);
  }, [connected]);

  const subscribeProperty = useCallback((propertyId) => {
    socketRef.current?.emit("subscribe:property", propertyId);
  }, []);

  return { socket: socketRef.current, connected, subscribeProperty };
}
