import api from '../../api/axios';
export const getRoles = async () => {
  const { data } = await api.get('/roles');
  return data;
};
export const createRole = async (payload) => {
  const { data } = await api.post('/roles', payload);
  return data;
};
export const updateRole = async (id, payload) => {
  const { data } = await api.patch(`/roles/${id}`, payload);
  return data;
};
export const deleteRole = async (id) => {
  const { data } = await api.delete(`/roles/${id}`);
  return data;
};
