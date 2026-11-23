export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.warn("Browser notifications are not supported");
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  return Notification.requestPermission();
}

export function showChromeNotification(title, options = {}) {
  if (!("Notification" in window)) return null;

  if (Notification.permission !== "granted") {
    return null;
  }

  const notification = new Notification(title, {
    body: options.body || "",
    icon: "/favicon.ico",
    tag: options.tag || "admin-notification",
    ...options,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();

    if (options.url) {
      window.location.href = options.url;
    }
  };

  return notification;
}
