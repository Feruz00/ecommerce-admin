import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import { getOrders, getOrder, updateOrderStatus } from "./api";

export const useOrders = (params = {}) => {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () => getOrders(params),
  });
};

export const useOrder = (id) => {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }) => updateOrderStatus(id, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-orders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-order", variables.id],
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-dashboard"],
      });

      message.success("Order updated successfully");
    },

    onError: (error) => {
      message.error(error.response?.data?.message || "Failed to update order");
    },
  });
};
