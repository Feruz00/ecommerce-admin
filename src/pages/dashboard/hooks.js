import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboard, getNotifications, markRead, markAllRead } from './api';

export const useDashboard = () => {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
  });
};

export const useNotifications = () => {
  return useQuery({
    queryKey: ['admin-notifications'],
    queryFn: getNotifications,
    refetchInterval: 30000,
  });
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => qc.invalidateQueries(['admin-notifications']),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries(['admin-notifications']),
  });
};
