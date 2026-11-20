export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const showChromeNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    icon: '/vite.svg',
    badge: '/vite.svg',
    ...options,
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
};
