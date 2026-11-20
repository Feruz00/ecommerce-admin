import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { login, logout, getMe } from './api';

export const useMe = () =>
  useQuery({
    queryKey: ['admin-me'],
    queryFn: getMe,
    retry: false,
    staleTime: 300000,
  });

export const useLogin = () => {
  const qc = useQueryClient();
  const nav = useNavigate();
  return useMutation({
    mutationFn: login,
    onSuccess: (d) => {
      const user = d?.data?.user;
      if (!user || !['admin', 'manager'].includes(user.role)) {
        message.error('Admin access only');
        return;
      }
      qc.setQueryData(['admin-me'], d);
      nav('/');
    },
    onError: (e) => message.error(e.response?.data?.message || 'Login failed'),
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  const nav = useNavigate();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      nav('/login');
    },
  });
};
