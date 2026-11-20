import api from '../../api/axios';

export const login = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

export const logout = async () => {
  const { data } = await api.get('/auth/logout');
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};
