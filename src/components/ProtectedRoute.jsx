import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useMe } from "../pages/auth/hooks";

export default function ProtectedRoute() {
  const location = useLocation();

  const { data, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const user = data?.data?.user;

  if (isError || !user || !["admin", "manager"].includes(user.role)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
