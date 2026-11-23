import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";
import { message } from "antd";

import { login, logout, getMe } from "./api";
import useAuthStore from "../../store/authStore";

const ALLOWED_ROLES = ["admin", "manager"];

import { useEffect } from "react";

export const useMe = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.logout);

  const query = useQuery({
    queryKey: ["admin-me"],
    queryFn: getMe,
    retry: false,
    staleTime: 300000,
  });

  useEffect(() => {
    if (query.isSuccess) {
      const user = query.data?.data?.user;

      if (user && ALLOWED_ROLES.includes(user.role)) {
        setUser(user);
      } else {
        clearUser();
      }
    }

    if (query.isError) {
      clearUser();
    }
  }, [query.isSuccess, query.isError, query.data, setUser, clearUser]);

  return query;
};

export const useLogin = () => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: login,

    onSuccess: (d) => {
      const user = d?.data?.user;

      if (!user || !ALLOWED_ROLES.includes(user.role)) {
        message.error("Admin access only");
        return;
      }

      setUser(user);
      qc.setQueryData(["admin-me"], d);

      nav("/", { replace: true });
    },

    onError: (e) => {
      message.error(e.response?.data?.message || "Login failed");
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  const nav = useNavigate();
  const clearUser = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: logout,

    onSuccess: () => {
      clearUser();
      qc.clear();
      nav("/login", { replace: true });
    },

    onError: (e) => {
      message.error(e.response?.data?.message || "Logout failed");
    },
  });
};
