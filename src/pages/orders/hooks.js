import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, updateOrderStatus } from './api';
import { message } from 'antd';

export const useOrders = (params = {}) => {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => getOrders(params),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateOrderStatus(id, payload),
    onSuccess: () => {
      qc.invalidateQueries(['admin-orders']);
      qc.invalidateQueries(['admin-dashboard']);
      message.success('Order updated');
    },
    onError: (err) => message.error(err.response?.data?.message || 'Update failed'),
  });
};
