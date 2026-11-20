import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser } from './api';
import { message } from 'antd';

export const useUsers = (params = {}) =>
  useQuery({ queryKey: ['admin-users', params], queryFn: () => getUsers(params) });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries(['admin-users']); message.success('User created'); },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateUser(id, payload),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); message.success('User updated'); },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { qc.invalidateQueries(['admin-users']); message.success('User deactivated'); },
  });
};
