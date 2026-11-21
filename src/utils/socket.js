import { io } from "socket.io-client";
import {
  requestNotificationPermission,
  showChromeNotification,
} from "./notify";
import useAuthStore from "../store/authStore";

let socket = null;
let notificationPermissionRequested = false;

export { requestNotificationPermission, showChromeNotification };

export function connectAdminSocket({ onNewOrder } = {}) {
  const user = useAuthStore.getState().user;

  if (!user?.id) {
    console.warn("[admin socket] No authenticated user");
    return null;
  }

  // Reuse existing connection for the same user.
  if (socket) {
    if (socket.connected && socket.auth?.userId === user.id) {
      return socket;
    }

    if (socket.auth?.userId !== user.id) {
      socket.disconnect();
      socket = null;
    }
  }

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(url, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket", "polling"],
    auth: {
      userId: user.id,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.auth = {
    ...socket.auth,
    userId: user.id,
  };

  socket.on("connect", () => {
    console.log("[admin socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[admin socket] disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[admin socket] connection error:", error.message);
  });

  socket.on("new_order", async (payload) => {
    console.log("[admin socket] new order:", payload);

    if (!notificationPermissionRequested) {
      notificationPermissionRequested = true;
      requestNotificationPermission();
    }

    if (Notification.permission === "granted") {
      showChromeNotification("New order", {
        body: `#${payload.orderNumber} — ${payload.total} TMT`,
      });
    }

    onNewOrder?.(payload);
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
