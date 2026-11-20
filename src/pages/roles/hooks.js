import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoles, createRole, updateRole, deleteRole } from './api';
import { message } from 'antd';

export const useRoles = () =>
  useQuery({ queryKey: ['admin-roles'], queryFn: getRoles });

export const useCreateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => { qc.invalidateQueries(['admin-roles']); message.success('Role created'); },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
};

export const useUpdateRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateRole(id, payload),
    onSuccess: () => { qc.invalidateQueries(['admin-roles']); message.success('Role updated'); },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
};

export const useDeleteRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { qc.invalidateQueries(['admin-roles']); message.success('Role deleted'); },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
};
