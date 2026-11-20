import { useMemo, useState } from "react";

import {
  Table,
  Tag,
  Select,
  Typography,
  Spin,
  Button,
  Modal,
  Descriptions,
  message,
  Card,
  Space,
  Divider,
  Empty,
} from "antd";

import {
  EyeOutlined,
  ShoppingOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { useOrders, useOrder, useUpdateOrderStatus } from "./hooks";

const { Title, Text } = Typography;

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const paymentStatuses = ["pending", "paid", "failed", "refunded"];

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

const formatPrice = (value) => {
  const number = Number(value ?? 0);

  return `${number.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} TMT`;
};

const formatDate = (value) => {
  return value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "—";
};

const capitalize = (value = "") => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function getCustomerName(user) {
  if (!user) return "—";

  return (
    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
    user.name ||
    "—"
  );
}

/**
 * MySQL JSON fields normally arrive as objects through Sequelize.
 * This also supports a JSON string in case the API serializes it that way.
 */
function parseAttributes(attributes) {
  if (!attributes) return {};

  if (typeof attributes === "string") {
    try {
      return JSON.parse(attributes);
    } catch {
      return {};
    }
  }

  if (typeof attributes === "object" && !Array.isArray(attributes)) {
    return attributes;
  }

  return {};
}

function getAttributeEntries(attributes) {
  const parsed = parseAttributes(attributes);

  return Object.entries(parsed)
    .filter(([key, value]) => {
      return (
        key !== "variant_id" &&
        value !== null &&
        value !== undefined &&
        value !== ""
      );
    })
    .map(([key, value]) => {
      let displayValue = value;

      if (typeof value === "object") {
        displayValue =
          value.name ??
          value.label ??
          value.value ??
          value.title ??
          JSON.stringify(value);
      }

      return {
        key,
        value: String(displayValue),
      };
    });
}

function VariantDetails({ item }) {
  const entries = getAttributeEntries(item.selected_attributes);
  const attributes = parseAttributes(item.selected_attributes);

  const variantId = item.variant_id || attributes.variant_id;

  if (!variantId && !entries.length) {
    return (
      <Tag color="default" className="!mt-2 !mr-0">
        Standard product
      </Tag>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(({ key, value }) => (
            <Tag key={key} color="blue" className="!mr-0">
              <span className="font-medium">{capitalize(key)}:</span> {value}
            </Tag>
          ))}
        </div>
      )}

      {variantId && (
        <Text type="secondary" className="block text-xs">
          Variant ID: {variantId}
        </Text>
      )}

      {!entries.length && variantId && (
        <Text type="secondary" className="text-xs">
          Variant selected
        </Text>
      )}
    </div>
  );
}

function OrderItemsTable({ items = [] }) {
  const columns = [
    {
      title: "Product",
      key: "product",
      width: 280,
      render: (_, item) => (
        <div className="min-w-[180px]">
          <div className="font-semibold text-slate-800">
            {item.product_name || item.product?.name || "Product"}
          </div>

          {item.product_sku && (
            <Text type="secondary" className="text-xs">
              SKU: {item.product_sku}
            </Text>
          )}

          <VariantDetails item={item} />
        </div>
      ),
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      width: 90,
      align: "center",
      render: (value) => (
        <span className="font-semibold">{Number(value || 0)}</span>
      ),
    },
    {
      title: "Unit price",
      dataIndex: "price",
      width: 130,
      align: "right",
      render: formatPrice,
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 130,
      align: "right",
      render: (value, item) => {
        const total =
          value !== undefined && value !== null
            ? value
            : Number(item.price || 0) * Number(item.quantity || 0);

        return <span className="font-semibold">{formatPrice(total)}</span>;
      },
    },
  ];

  return (
    <Table
      size="middle"
      pagination={false}
      rowKey={(item) =>
        item.id || `${item.product_id}-${item.variant_id || "standard"}`
      }
      dataSource={items}
      columns={columns}
      scroll={{ x: 650 }}
      locale={{
        emptyText: <Empty description="No products in this order" />,
      }}
    />
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <Card size="small" className="h-full">
      <Text type="secondary">{label}</Text>
      <div className={`mt-1 text-2xl font-bold ${color || "text-slate-800"}`}>
        {value}
      </div>
    </Card>
  );
}

function getOrdersFromResponse(response) {
  return (
    response?.data?.orders ||
    response?.orders ||
    response?.data?.rows ||
    response?.rows ||
    []
  );
}

function getOrderFromResponse(response) {
  return response?.data?.order || response?.order || response?.data || null;
}

export default function OrdersPage() {
  const [status, setStatus] = useState(undefined);
  const [detailId, setDetailId] = useState(null);

  const {
    data: ordersResponse,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useOrders({
    limit: 50,
    status: status || undefined,
  });

  const {
    data: detailResponse,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useOrder(detailId);

  const updateMutation = useUpdateOrderStatus();

  const orders = useMemo(
    () => getOrdersFromResponse(ordersResponse),
    [ordersResponse],
  );

  const detail = useMemo(
    () => getOrderFromResponse(detailResponse),
    [detailResponse],
  );

  const summary = useMemo(() => {
    return {
      count: orders.length,

      pending: orders.filter((order) => order.status === "pending").length,

      processing: orders.filter((order) =>
        ["confirmed", "processing", "shipped"].includes(order.status),
      ).length,

      completed: orders.filter((order) => order.status === "delivered").length,
    };
  }, [orders]);

  const handleStatusChange = (order, nextStatus) => {
    if (nextStatus === order.status) return;

    updateMutation.mutate({
      id: order.id,
      status: nextStatus,
    });
  };

  const handlePaymentChange = (order, nextStatus) => {
    if (nextStatus === order.payment_status) return;

    updateMutation.mutate({
      id: order.id,
      payment_status: nextStatus,
    });
  };

  const columns = [
    {
      title: "Order",
      dataIndex: "order_number",
      width: 155,
      render: (value) => (
        <div className="font-semibold text-slate-800">{value || "—"}</div>
      ),
    },
    {
      title: "Customer",
      key: "customer",
      width: 190,
      render: (_, order) => (
        <div>
          <div className="font-medium text-slate-800">
            {getCustomerName(order.user)}
          </div>

          <div className="text-xs text-slate-400">
            {order.user?.email || order.user?.phone || "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Items",
      dataIndex: "items",
      width: 90,
      align: "center",
      render: (items) => {
        const quantity = (items || []).reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        );

        return <Tag>{quantity}</Tag>;
      },
    },
    {
      title: "Total",
      dataIndex: "total",
      width: 130,
      align: "right",
      render: (value) => (
        <span className="font-semibold">{formatPrice(value)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 155,
      render: (value, order) => (
        <Select
          size="small"
          value={value}
          disabled={updateMutation.isPending}
          style={{ width: 135 }}
          options={statuses.map((item) => ({
            value: item,
            label: (
              <Tag color={statusColors[item]} className="!mr-0">
                {capitalize(item)}
              </Tag>
            ),
          }))}
          onChange={(nextStatus) => handleStatusChange(order, nextStatus)}
        />
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_status",
      width: 135,
      render: (value, order) => (
        <Select
          size="small"
          value={value}
          disabled={updateMutation.isPending}
          style={{ width: 115 }}
          options={paymentStatuses.map((item) => ({
            value: item,
            label: (
              <Tag color={paymentColors[item]} className="!mr-0">
                {capitalize(item)}
              </Tag>
            ),
          }))}
          onChange={(nextStatus) => handlePaymentChange(order, nextStatus)}
        />
      ),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      width: 155,
      render: formatDate,
    },
    {
      title: "",
      key: "action",
      width: 65,
      fixed: "right",
      render: (_, order) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailId(order.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1">
            Orders
          </Title>

          <Text type="secondary">
            Manage customer orders and purchased products.
          </Text>
        </div>

        <Space wrap>
          <Select
            allowClear
            placeholder="All statuses"
            style={{ width: 170 }}
            value={status}
            onChange={setStatus}
            options={statuses.map((item) => ({
              value: item,
              label: capitalize(item),
            }))}
          />

          <Button
            icon={<ReloadOutlined />}
            loading={isFetching}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Loaded orders" value={summary.count} />

        <SummaryCard
          label="Pending"
          value={summary.pending}
          color="text-orange-500"
        />

        <SummaryCard
          label="In progress"
          value={summary.processing}
          color="text-blue-500"
        />

        <SummaryCard
          label="Delivered"
          value={summary.completed}
          color="text-green-600"
        />
      </div>

      {/* Orders table */}
      <Card
        bordered={false}
        className="shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spin size="large" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <Empty description="Failed to load orders">
              <Button onClick={() => refetch()}>Try again</Button>
            </Empty>
          </div>
        ) : (
          <Table
            rowKey="id"
            dataSource={orders}
            columns={columns}
            scroll={{ x: 1150 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: [15, 30, 50],
              showTotal: (total) => `${total} orders`,
            }}
            locale={{
              emptyText: <Empty description="No orders found" />,
            }}
          />
        )}
      </Card>

      {/* Order details modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ShoppingOutlined />
            <span>
              {detail?.order_number
                ? `Order ${detail.order_number}`
                : "Order details"}
            </span>
          </div>
        }
        open={Boolean(detailId)}
        onCancel={() => setDetailId(null)}
        footer={[
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => refetchDetail()}
            loading={detailLoading}
          >
            Refresh
          </Button>,
          <Button key="close" onClick={() => setDetailId(null)}>
            Close
          </Button>,
        ]}
        width={900}
        destroyOnHidden
      >
        {detailLoading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : detailError ? (
          <Empty description="Failed to load order details">
            <Button onClick={() => refetchDetail()}>Try again</Button>
          </Empty>
        ) : !detail ? (
          <Empty description="Order details not available" />
        ) : (
          <div className="space-y-5">
            {/* Order status */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={statusColors[detail.status] || "default"}>
                {capitalize(detail.status || "unknown")}
              </Tag>

              <Tag color={paymentColors[detail.payment_status] || "default"}>
                Payment: {capitalize(detail.payment_status || "unknown")}
              </Tag>

              <Text type="secondary" className="text-xs">
                {formatDate(detail.created_at)}
              </Text>
            </div>

            {/* Customer and shipping */}
            <Descriptions
              title="Customer and delivery"
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
            >
              <Descriptions.Item label="Customer">
                {getCustomerName(detail.user)}
              </Descriptions.Item>

              <Descriptions.Item label="Email">
                {detail.user?.email || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Phone">
                {detail.shipping_address?.phone || detail.user?.phone || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Payment method">
                {detail.payment_method || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Recipient">
                {detail.shipping_address?.full_name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="City">
                {detail.shipping_address?.city || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="District">
                {detail.shipping_address?.district || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Street">
                {detail.shipping_address?.street || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Note" span={2}>
                {detail.note || "—"}
              </Descriptions.Item>
            </Descriptions>

            <Divider className="!my-3" />

            {/* Order products */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Title level={5} className="!mb-0">
                  Purchased products
                </Title>

                <Text type="secondary" className="text-xs">
                  {detail.items?.length || 0} order items
                </Text>
              </div>

              <OrderItemsTable items={detail.items || []} />
            </div>

            {/* Financial summary */}
            <div className="ml-auto max-w-sm rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between py-1.5 text-sm">
                <Text type="secondary">Subtotal</Text>
                <Text>{formatPrice(detail.subtotal)}</Text>
              </div>

              <div className="flex justify-between py-1.5 text-sm">
                <Text type="secondary">Shipping</Text>
                <Text>{formatPrice(detail.shipping_cost)}</Text>
              </div>

              <div className="flex justify-between py-1.5 text-sm">
                <Text type="secondary">Discount</Text>
                <Text>{formatPrice(detail.discount)}</Text>
              </div>

              <Divider className="!my-2" />

              <div className="flex justify-between">
                <Text strong>Total</Text>

                <Text strong className="text-lg text-indigo-600">
                  {formatPrice(detail.total)}
                </Text>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
