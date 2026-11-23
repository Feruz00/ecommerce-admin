import { io } from "socket.io-client";

import {
  requestNotificationPermission,
  showChromeNotification,
} from "./notify";

import useAuthStore from "../store/authStore";

let socket = null;
let notificationPermissionRequested = false;

export { requestNotificationPermission, showChromeNotification };

export function connectAdminSocket({ onNewOrder, onNewNotification } = {}) {
  const user = useAuthStore.getState().user;

  if (!user?.id) {
    console.warn("[admin socket] No authenticated user");
    return null;
  }

  // Reuse an existing connection for the same user.
  if (socket) {
    if (Number(socket.auth?.userId) === user.id && !socket.disconnected) {
      return socket;
    }

    socket.disconnect();
    socket = null;
  }

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(url, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    auth: {},
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Used only for local connection reuse.
  socket.auth.userId = user.id;

  socket.on("connect", () => {
    console.log("[admin socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[admin socket] disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[admin socket] connection error:", error.message);
  });

  // New order.
  socket.on("new_order", (payload) => {
    console.log("[admin socket] new order:", payload);

    onNewOrder?.(payload);
  });

  // New admin notification.
  socket.on("new_notification", (payload) => {
    // Each admin only handles their own notification.
    if (String(payload.userId) !== String(user.id)) {
      return;
    }

    console.log("[admin socket] new notification:", payload);

    if (!notificationPermissionRequested) {
      notificationPermissionRequested = true;
      requestNotificationPermission();
    }

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      showChromeNotification(payload.title, {
        body: payload.message,
        tag: payload.id,
      });
    }

    onNewNotification?.(payload);
  });

  return socket;
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export const getSocket = () => socket;
