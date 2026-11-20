import api from '../../api/axios';

export const getDashboard = async () => {
  const { data } = await api.get('/admin/dashboard');
  return data;
};

export const getNotifications = async () => {
  const { data } = await api.get('/admin/notifications');
  return data;
};

export const markRead = async (id) => {
  const { data } = await api.patch(`/admin/notifications/${id}/read`);
  return data;
};

export const markAllRead = async () => {
  const { data } = await api.patch('/admin/notifications/read-all');
  return data;
};
