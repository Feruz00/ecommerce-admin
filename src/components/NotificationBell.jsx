import { useState } from "react";

import {
  Badge,
  Button,
  Dropdown,
  List,
  Typography,
  Empty,
  Space,
  Tag,
  Popconfirm,
  Tooltip,
  Spin,
  message,
} from "antd";

import {
  BellOutlined,
  ShoppingCartOutlined,
  DeleteOutlined,
  CheckOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { notificationApi } from "../pages/notifications/api";

const { Text } = Typography;

const localeMap = {
  en: "en-US",
  ru: "ru-RU",
  tm: "tk-TM",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { t, i18n } = useTranslation();

  const language = i18n.language?.slice(0, 2) || "en";

  const locale = localeMap[language] || "en-US";

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () =>
      notificationApi
        .getAll({
          page: 1,
          limit: 20,
        })
        .then((res) => res.data),
  });

  const notifications = data?.data?.notifications || [];

  const unreadCount = data?.data?.unreadCount || 0;

  // Refresh notification data.
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-notifications"],
    });
  };

  // Translate notification content.
  const getNotificationContent = (item) => {
    if (item.type === "order_new") {
      const orderNumber = item.data?.orderNumber;
      const total = item.data?.total;

      return {
        title: t("notifications.newOrderTitle"),

        description:
          orderNumber != null && total != null
            ? t("notifications.orderMessage", {
                orderNumber,
                total,
              })
            : t("notifications.orderFallback"),
      };
    }

    // Fallback for notification types not yet translated.
    return {
      title: item.title,
      description: item.message,
    };
  };

  // Format notification date.
  const formatDate = (date) => {
    if (!date) return "";

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  // Mark one notification as read.
  const readMutation = useMutation({
    mutationFn: notificationApi.markAsRead,

    onSuccess: () => {
      refresh();
    },

    onError: () => {
      message.error(t("notifications.markReadFailed"));
    },
  });

  // Mark all notifications as read.
  const readAllMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,

    onSuccess: () => {
      message.success(t("notifications.markedAllRead"));
      refresh();
    },

    onError: () => {
      message.error(t("notifications.updateFailed"));
    },
  });

  // Delete one notification.
  const deleteMutation = useMutation({
    mutationFn: notificationApi.delete,

    onSuccess: () => {
      message.success(t("notifications.deleted"));
      refresh();
    },

    onError: () => {
      message.error(t("notifications.deleteFailed"));
    },
  });

  // Delete all notifications.
  const deleteAllMutation = useMutation({
    mutationFn: notificationApi.deleteAll,

    onSuccess: () => {
      message.success(t("notifications.deletedAll"));
      refresh();
    },

    onError: () => {
      message.error(t("notifications.deleteAllFailed"));
    },
  });

  // Handle notification click.
  const handleNotificationClick = async (item) => {
    try {
      if (!item.is_read) {
        await readMutation.mutateAsync(item.id);
      }

      setOpen(false);

      if (item.data?.orderId) {
        navigate("/orders");
      }
    } catch {
      // Error is already handled by mutation onError.
    }
  };

  const content = (
    <div
      className="bg-white rounded-lg shadow-lg border"
      style={{
        width: 380,
        maxHeight: 500,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Space>
          <Text strong>{t("notifications.title")}</Text>

          {unreadCount > 0 && (
            <Tag color="blue">
              {t("notifications.new", {
                count: unreadCount,
              })}
            </Tag>
          )}
        </Space>

        <Space size={4}>
          <Tooltip title={t("notifications.markAllRead")}>
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              disabled={!unreadCount}
              loading={readAllMutation.isPending}
              onClick={() => readAllMutation.mutate()}
            />
          </Tooltip>

          <Popconfirm
            title={t("notifications.deleteAllConfirm")}
            description={t("notifications.deleteAllDescription")}
            onConfirm={() => deleteAllMutation.mutate()}
            okText={t("notifications.delete")}
            cancelText={t("notifications.cancel")}
          >
            <Tooltip title={t("notifications.deleteAll")}>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={!notifications.length}
                loading={deleteAllMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>

      {/* Notification list */}
      <div
        style={{
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("notifications.empty")}
            className="py-8"
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => {
              const notification = getNotificationContent(item);

              return (
                <List.Item
                  key={item.id}
                  className="px-3 hover:bg-gray-50"
                  style={{
                    background: item.is_read ? "#fff" : "#f0f7ff",
                  }}
                  actions={[
                    !item.is_read && (
                      <Tooltip title={t("notifications.markRead")} key="read">
                        <Button
                          type="text"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            readMutation.mutate(item.id);
                          }}
                        />
                      </Tooltip>
                    ),

                    <Tooltip title={t("notifications.delete")} key="delete">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(item.id);
                        }}
                      />
                    </Tooltip>,
                  ]}
                >
                  <div
                    className="flex gap-3 w-full cursor-pointer"
                    onClick={() => handleNotificationClick(item)}
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        background: item.is_read ? "#f0f0f0" : "#dbeafe",
                      }}
                    >
                      <ShoppingCartOutlined
                        style={{
                          fontSize: 17,
                          color: "#1677ff",
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <Text strong={!item.is_read} className="truncate">
                          {notification.title}
                        </Text>

                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>

                      <Text type="secondary" className="block text-xs">
                        {notification.description}
                      </Text>

                      <Text type="secondary" className="text-xs">
                        {formatDate(item.created_at)}
                      </Text>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2 text-center">
        <Button
          type="link"
          size="small"
          onClick={() => {
            setOpen(false);
            navigate("/orders");
          }}
        >
          {t("notifications.viewOrders")}
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => content}
      trigger={["click"]}
      placement="bottomRight"
    >
      <Badge
        count={unreadCount}
        size="small"
        overflowCount={99}
        offset={[-3, 3]}
      >
        <Button type="text" icon={<BellOutlined style={{ fontSize: 19 }} />} />
      </Badge>
    </Dropdown>
  );
}
