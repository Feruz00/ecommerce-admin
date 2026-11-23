import api from "../../api/axios";

export const notificationApi = {
  getAll: (params = {}) => api.get("/admin/notifications", { params }),

  markAsRead: (id) => api.patch(`/admin/notifications/${id}/read`),

  markAllAsRead: () => api.patch("/admin/notifications/read-all"),

  delete: (id) => api.delete(`/admin/notifications/${id}`),

  deleteAll: () => api.delete("/admin/notifications"),
};
