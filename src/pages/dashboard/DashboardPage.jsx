import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Spin,
  Empty,
  Alert,
  Button,
  Tooltip,
} from "antd";

import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import api from "../../api/axios";

const { Title, Text } = Typography;

const statusColors = {
  pending: "orange",
  confirmed: "blue",
  processing: "cyan",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
};

const paymentColors = {
  pending: "orange",
  paid: "green",
  failed: "red",
  refunded: "purple",
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const formatMoney = (value) => `${formatNumber(value)} TMT`;

const formatCustomer = (value, fallback) => value || fallback;

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const response = await api.get("/admin/dashboard");
      return response.data?.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Alert
          type="error"
          showIcon
          message={t("dashboard.loadFailed")}
          description={
            error?.response?.data?.message ||
            error?.message ||
            t("messages.error")
          }
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              {t("dashboard.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentOrders = data?.recentOrders || [];
  const lowStock = data?.lowStock || [];

  const orderColumns = [
    {
      title: t("dashboard.order"),
      dataIndex: "order_number",
      key: "order_number",
      render: (value) => (
        <Text code copyable>
          {value || "—"}
        </Text>
      ),
    },
    {
      title: t("dashboard.customer"),
      dataIndex: "customer_name",
      key: "customer",
      render: (value) => (
        <Text strong>
          {formatCustomer(value, t("dashboard.guestCustomer"))}
        </Text>
      ),
    },
    {
      title: t("dashboard.total"),
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (value) => <Text strong>{formatMoney(value)}</Text>,
    },
    {
      title: t("dashboard.status"),
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={statusColors[status] || "default"}>
          {status
            ? t(`orderStatus.${status}`, {
                defaultValue: status,
              })
            : t("dashboard.unknown")}
        </Tag>
      ),
    },
    {
      title: t("dashboard.payment"),
      dataIndex: "payment_status",
      key: "payment_status",
      render: (status) => (
        <Tag color={paymentColors[status] || "default"}>
          {status
            ? t(`paymentStatus.${status}`, {
                defaultValue: status,
              })
            : t("dashboard.unknown")}
        </Tag>
      ),
    },
    {
      title: t("dashboard.date"),
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => (
        <Tooltip title={date ? dayjs(date).format("YYYY-MM-DD HH:mm:ss") : ""}>
          {date ? dayjs(date).format("DD MMM, HH:mm") : "—"}
        </Tooltip>
      ),
    },
  ];

  const stockColumns = [
    {
      title: t("dashboard.sku"),
      dataIndex: "sku",
      key: "sku",
      render: (value) => <Text code>{value || "—"}</Text>,
    },
    {
      title: t("dashboard.product"),
      dataIndex: "name",
      key: "name",
      render: (value) => (
        <Text strong>{value || t("dashboard.unnamedProduct")}</Text>
      ),
    },
    {
      title: t("dashboard.stock"),
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      render: (quantity) => {
        const qty = Number(quantity || 0);

        return <Tag color={qty <= 0 ? "red" : "orange"}>{qty}</Tag>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1">
            {t("dashboard.title")}
          </Title>
          <Text type="secondary">{t("dashboard.subtitle")}</Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isFetching}
        >
          {t("common.refresh")}
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="h-full">
            <Statistic
              title={t("dashboard.customers")}
              value={stats.customers || 0}
              prefix={<UserOutlined />}
              formatter={formatNumber}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="h-full">
            <Statistic
              title={t("dashboard.activeProducts")}
              value={stats.products || 0}
              prefix={<ShoppingOutlined />}
              formatter={formatNumber}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="h-full">
            <Statistic
              title={t("dashboard.totalOrders")}
              value={stats.orders || 0}
              prefix={<ShoppingCartOutlined />}
              formatter={formatNumber}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="h-full">
            <Statistic
              title={t("dashboard.paidRevenue")}
              value={stats.revenue || 0}
              prefix={<DollarOutlined />}
              suffix="TMT"
              precision={2}
              formatter={formatNumber}
            />
          </Card>
        </Col>
      </Row>

      {/* Tables */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card
            title={t("dashboard.recentOrders")}
            extra={
              <Text type="secondary">
                {t("dashboard.latestOrders", {
                  count: recentOrders.length,
                })}
              </Text>
            }
          >
            <Table
              size="middle"
              rowKey="id"
              pagination={false}
              dataSource={recentOrders}
              columns={orderColumns}
              scroll={{ x: 850 }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t("dashboard.noOrders")}
                  />
                ),
              }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <WarningOutlined className="text-orange-500" />
                <span>{t("dashboard.lowStock")}</span>
              </div>
            }
            extra={
              <Tag color={lowStock.length ? "orange" : "green"}>
                {lowStock.length}
              </Tag>
            }
          >
            <Table
              size="middle"
              rowKey="id"
              pagination={false}
              dataSource={lowStock}
              columns={stockColumns}
              scroll={{ x: 350 }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t("dashboard.allStockSufficient")}
                  />
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
