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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const payStatuses = ["pending", "paid", "failed", "refunded"];

const formatPrice = (value) =>
  `${Number(value || 0).toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  })} TMT`;

const formatDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY, HH:mm") : "—";

function getCustomerName(user) {
  if (!user) return "—";

  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—";
}

/**
 * Convert saved selected_attributes into readable rows.
 *
 * Supports:
 * {
 *   color: "Black",
 *   size: "XL",
 *   variant_id: "uuid"
 * }
 *
 * Also supports nested objects.
 */
function getAttributeEntries(attributes) {
  if (!attributes || typeof attributes !== "object") {
    return [];
  }

  return Object.entries(attributes)
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
          value.name ||
          value.label ||
          value.value ||
          value.title ||
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

  if (!item.variant_id && !entries.length) {
    return (
      <Text type="secondary" className="text-xs">
        Standard product
      </Text>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {entries.map(({ key, value }) => (
          <Tag key={key} color="blue" className="!mr-0">
            <span className="font-medium">{key}:</span> {value}
          </Tag>
        ))}
      </div>

      {item.variant_id && (
        <div>
          <Text type="secondary" className="text-xs">
            Variant ID: {item.variant_id}
          </Text>
        </div>
      )}

      {!entries.length && item.selected_attributes?.variant_id && (
        <Text type="secondary" className="text-xs">
          Variant selected
        </Text>
      )}
    </div>
  );
}

function OrderItemsTable({ items = [] }) {
  return (
    <Table
      size="middle"
      pagination={false}
      rowKey="id"
      dataSource={items}
      scroll={{ x: 750 }}
      locale={{
        emptyText: <Empty description="No products in this order" />,
      }}
      columns={[
        {
          title: "Product",
          key: "product",
          width: 260,
          render: (_, item) => (
            <div>
              <div className="font-semibold text-slate-800">
                {item.product_name || "Product"}
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
          render: (value) => <span className="font-semibold">{value}</span>,
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
          render: (value) => (
            <span className="font-semibold">{formatPrice(value)}</span>
          ),
        },
      ]}
    />
  );
}

export default function OrdersPage() {
  const [status, setStatus] = useState(undefined);
  const [detailId, setDetailId] = useState(null);

  const qc = useQueryClient();

  // Orders list
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-orders", status],
    queryFn: () =>
      api
        .get("/orders", {
          params: {
            limit: 50,
            status: status || undefined,
          },
        })
        .then((response) => response.data),
  });

  // Load complete order details when modal opens.
  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-order", detailId],
    queryFn: () =>
      api.get(`/orders/${detailId}`).then((response) => response.data),
    enabled: !!detailId,
  });

  const detail = detailResponse?.data?.order || detailResponse?.order || null;

  // Update status/payment
  const updateMut = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/orders/${id}/status`, body),

    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["admin-orders"],
      });

      qc.invalidateQueries({
        queryKey: ["admin-order", variables.id],
      });

      message.success("Order updated");
    },

    onError: (error) => {
      message.error(error.response?.data?.message || "Failed to update order");
    },
  });

  const orders = data?.data?.orders || [];

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

  const columns = [
    {
      title: "Order",
      dataIndex: "order_number",
      width: 150,
      render: (value) => (
        <div>
          <div className="font-semibold text-slate-800">{value}</div>
        </div>
      ),
    },
    {
      title: "Customer",
      key: "customer",
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
      render: (items) => (
        <Tag>
          {items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ||
            0}
        </Tag>
      ),
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
          disabled={updateMut.isPending}
          style={{ width: 135 }}
          options={statuses.map((item) => ({
            value: item,
            label: item,
          }))}
          onChange={(nextStatus) =>
            updateMut.mutate({
              id: order.id,
              status: nextStatus,
            })
          }
        />
      ),
    },
    {
      title: "Payment",
      dataIndex: "payment_status",
      width: 130,
      render: (value, order) => (
        <Select
          size="small"
          value={value}
          disabled={updateMut.isPending}
          style={{ width: 110 }}
          options={payStatuses.map((item) => ({
            value: item,
            label: item,
          }))}
          onChange={(nextStatus) =>
            updateMut.mutate({
              id: order.id,
              payment_status: nextStatus,
            })
          }
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

        <Space>
          <Select
            allowClear
            placeholder="All statuses"
            style={{ width: 170 }}
            value={status}
            onChange={setStatus}
            options={statuses.map((item) => ({
              value: item,
              label: item,
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
        <Card size="small">
          <Text type="secondary">Loaded orders</Text>
          <div className="mt-1 text-2xl font-bold">{summary.count}</div>
        </Card>

        <Card size="small">
          <Text type="secondary">Pending</Text>
          <div className="mt-1 text-2xl font-bold text-orange-500">
            {summary.pending}
          </div>
        </Card>

        <Card size="small">
          <Text type="secondary">In progress</Text>
          <div className="mt-1 text-2xl font-bold text-blue-500">
            {summary.processing}
          </div>
        </Card>

        <Card size="small">
          <Text type="secondary">Delivered</Text>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {summary.completed}
          </div>
        </Card>
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
          />
        )}
      </Card>

      {/* Order details */}
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
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={[
          <Button key="close" onClick={() => setDetailId(null)}>
            Close
          </Button>,
        ]}
        width={850}
        destroyOnHidden
      >
        {detailLoading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : !detail ? (
          <Empty description="Order details not available" />
        ) : (
          <div className="space-y-5">
            {/* Status */}
            <div className="flex flex-wrap items-center gap-2">
              <Tag color={statusColors[detail.status]}>{detail.status}</Tag>

              <Tag color={paymentColors[detail.payment_status]}>
                Payment: {detail.payment_status}
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

            {/* Purchased products */}
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <Title level={5} className="!mb-0">
                  Purchased products
                </Title>

                <Text type="secondary" className="text-xs">
                  {detail.items?.length || 0} different products
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
