import api from "../../api/axios";

export const getOrders = async (params = {}) => {
  const { data } = await api.get("/orders", { params });
  return data;
};

export const getOrder = async (id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
};

export const updateOrderStatus = async (id, payload) => {
  const { data } = await api.patch(`/orders/${id}/status`, payload);
  return data;
};
