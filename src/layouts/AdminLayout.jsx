import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Layout, Menu, Button, Dropdown, Badge, Select, theme } from "antd";
import {
  ShoppingOutlined,
  AppstoreOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
  BellOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  TeamOutlined,
  HomeOutlined,
  FormOutlined,
  LoadingOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMe, useLogout } from "../pages/auth/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { connectAdminSocket, disconnectAdminSocket } from "../utils/socket";
import useAuthStore from "../store/authStore";

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();

  const { data: meData } = useMe();
  const logoutMutation = useLogout();

  const user = meData?.data?.user;

  const { data: notifData } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api.get("/admin/notifications").then((r) => r.data),
    refetchInterval: 30000,
    enabled: !!user,
  });

  const notificationCount = notifData?.data?.unreadCount || 0;

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  // Admin socket
  useEffect(() => {
    if (!user?.id) return;

    connectAdminSocket({
      onNewOrder: () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({
          queryKey: ["admin-notifications"],
        });
      },
    });

    return () => {
      disconnectAdminSocket();
    };
  }, [user?.id, queryClient]);

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("admin_lang", lang);
  };

  const selected = location.pathname.split("/")[1] || "dashboard";

  const items = [
    {
      key: "dashboard",
      icon: <HomeOutlined />,
      label: <Link to="/">{t("nav.dashboard")}</Link>,
    },
    {
      key: "products",
      icon: <ShoppingOutlined />,
      label: <Link to="/products">{t("nav.products")}</Link>,
    },
    {
      key: "categories",
      icon: <AppstoreOutlined />,
      label: <Link to="/categories">{t("nav.categories")}</Link>,
    },
    {
      key: "banners",
      icon: <PictureOutlined />,
      label: <Link to="/banners">{t("nav.banners")}</Link>,
    },
    {
      key: "attributes",
      icon: <FormOutlined />,
      label: <Link to="/attributes">{t("nav.attributes")}</Link>,
    },
    {
      key: "orders",
      icon: <ShoppingCartOutlined />,
      label: <Link to="/orders">{t("nav.orders")}</Link>,
    },
    {
      key: "reports",
      icon: <BarChartOutlined />,
      label: <Link to="/reports">{t("nav.reports")}</Link>,
    },
  ];

  if (user?.role === "admin") {
    items.push({
      key: "users",
      icon: <TeamOutlined />,
      label: <Link to="/users">{t("nav.users")}</Link>,
    });
  }

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={220}
        className="h-screen overflow-hidden"
      >
        <div className="h-14 flex items-center justify-center text-white font-bold text-lg">
          {collapsed ? "TS" : "TechStore"}
        </div>

        <div className="h-[calc(100%-56px)] overflow-y-auto">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selected]}
            items={items}
          />
        </div>
      </Sider>

      <Layout className="h-screen min-w-0 overflow-hidden">
        <Header
          style={{
            background: token.colorBgContainer,
            paddingInline: 16,
            height: 56,
            lineHeight: "56px",
          }}
          className="flex flex-shrink-0 items-center justify-between shadow-sm"
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((c) => !c)}
          />

          <div className="flex items-center gap-3">
            <Select
              value={i18n.language?.slice(0, 2) || "en"}
              onChange={changeLang}
              options={[
                { value: "en", label: "EN" },
                { value: "tm", label: "TM" },
                { value: "ru", label: "RU" },
              ]}
              suffixIcon={<GlobalOutlined />}
              size="small"
              style={{ width: 72 }}
            />

            <Badge count={notificationCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => navigate("/orders")}
              />
            </Badge>

            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: t("logout", "Logout"),
                    onClick: () => logoutMutation.mutate(),
                  },
                ],
              }}
            >
              <Button type="text" icon={<UserOutlined />}>
                {user?.first_name || user?.email}
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50 p-4">
          <div className="min-h-full bg-white rounded-lg p-6">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
