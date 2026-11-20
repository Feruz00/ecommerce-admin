import { io } from 'socket.io-client';
import { requestNotificationPermission, showChromeNotification } from './notify';

let socket = null;

export { requestNotificationPermission, showChromeNotification };

export function connectAdminSocket(onNewOrder) {
  if (socket?.connected) return socket;

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(':3001', ':5000');

  socket = io(url, {
    withCredentials: true,
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[admin socket] connected');
  });

  socket.on('new_order', (payload) => {
    requestNotificationPermission().then((ok) => {
      if (ok) {
        showChromeNotification('New order', {
          body: `#${payload.orderNumber} — ${payload.total} TMT`,
        });
      }
    });
    onNewOrder?.(payload);
  });

  return socket;
}

export const getSocket = () => socket;
