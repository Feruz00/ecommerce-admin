import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Statistic,
  Empty,
  message,
} from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  BarChartOutlined,
  RiseOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../../api/axios";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const money = (value) =>
  `${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} TMT`;

const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#6366f1",
  shipped: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#94a3b8",
};

const STATUS_TAG_COLORS = {
  pending: "orange",
  confirmed: "blue",
  processing: "geekblue",
  shipped: "cyan",
  delivered: "success",
  cancelled: "default",
};

const PAYMENT_COLORS = {
  pending: "#f59e0b",
  paid: "#10b981",
  failed: "#ef4444",
  refunded: "#8b5cf6",
};

const PAYMENT_TAG_COLORS = {
  pending: "orange",
  paid: "success",
  failed: "error",
  refunded: "purple",
};

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#ec4899",
  "#84cc16",
];

function buildParams(filters, page = 1, limit = 20) {
  const params = { page, limit };
  if (filters.range?.[0]) {
    params.start_date = filters.range[0].format("YYYY-MM-DD");
  }
  if (filters.range?.[1]) {
    params.end_date = filters.range[1].format("YYYY-MM-DD");
  }
  if (filters.status) params.status = filters.status;
  if (filters.payment_status) params.payment_status = filters.payment_status;
  if (filters.payment_method) params.payment_method = filters.payment_method;
  return params;
}

function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      {label && (
        <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
      )}
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 text-sm text-slate-700"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: entry.color || entry.fill }}
          />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-medium tabular-nums">
            {valueFormatter
              ? valueFormatter(entry.value)
              : Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    range: [dayjs().subtract(29, "day"), dayjs()],
    status: undefined,
    payment_status: undefined,
    payment_method: undefined,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [exporting, setExporting] = useState(false);

  const queryParams = useMemo(
    () => buildParams(filters, page, pageSize),
    [filters, page, pageSize],
  );

  const summaryQuery = useQuery({
    queryKey: ["admin-reports-summary", filters],
    queryFn: () =>
      api
        .get("/reports/summary", { params: buildParams(filters) })
        .then((r) => r.data),
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-reports-orders", queryParams],
    queryFn: () =>
      api.get("/reports/orders", { params: queryParams }).then((r) => r.data),
  });

  const topProductsQuery = useQuery({
    queryKey: ["admin-reports-top-products", filters],
    queryFn: () =>
      api
        .get("/reports/top-products", {
          params: { ...buildParams(filters), limit: 10 },
        })
        .then((r) => r.data),
  });

  const dailyQuery = useQuery({
    queryKey: ["admin-reports-daily", filters],
    queryFn: () =>
      api
        .get("/reports/daily", { params: buildParams(filters) })
        .then((r) => r.data),
  });

  const summary = summaryQuery.data?.data?.summary || {};
  const orders = ordersQuery.data?.data?.orders || [];
  const totalOrders = ordersQuery.data?.total || 0;
  const topProducts = topProductsQuery.data?.data?.products || [];
  const daily = dailyQuery.data?.data?.daily || [];

  const dailyChartData = useMemo(
    () =>
      daily.map((row) => ({
        date: dayjs(row.date).format("MM/DD"),
        fullDate: dayjs(row.date).format("YYYY-MM-DD"),
        orders: row.orders,
        revenue: Number(row.revenue) || 0,
      })),
    [daily],
  );

  const statusChartData = useMemo(() => {
    if (!summary.by_status) return [];
    return Object.entries(summary.by_status).map(([status, count]) => ({
      name: t(`orderStatus.${status}`, status),
      value: Number(count) || 0,
      status,
      color: STATUS_COLORS[status] || "#94a3b8",
    }));
  }, [summary.by_status, t]);

  const paymentChartData = useMemo(() => {
    if (!summary.by_payment) return [];
    return Object.entries(summary.by_payment).map(([status, count]) => ({
      name: t(`paymentStatus.${status}`, status),
      value: Number(count) || 0,
      status,
      color: PAYMENT_COLORS[status] || "#94a3b8",
    }));
  }, [summary.by_payment, t]);

  const topProductsChartData = useMemo(
    () =>
      [...topProducts]
        .slice(0, 8)
        .reverse()
        .map((p) => ({
          name:
            (p.name || p.sku || "—").length > 22
              ? `${(p.name || p.sku).slice(0, 20)}…`
              : p.name || p.sku || "—",
          fullName: p.name || p.sku || "—",
          revenue: Number(p.revenue) || 0,
          quantity: Number(p.quantity_sold) || 0,
        })),
    [topProducts],
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      range: [dayjs().subtract(29, "day"), dayjs()],
      status: undefined,
      payment_status: undefined,
      payment_method: undefined,
    });
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const params = buildParams(filters);

      const response = await api.get("/reports/export/excel", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `orders-report-${dayjs().format("YYYY-MM-DD")}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      message.success(
        t("reports.exportSuccess", "Excel report exported successfully"),
      );
    } catch (error) {
      let errorMessage = t(
        "reports.exportError",
        "Could not export Excel report",
      );

      // Handle errors returned as Blob
      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text());
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Keep fallback error message
        }
      } else {
        errorMessage = error.response?.data?.message || errorMessage;
      }

      message.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const orderColumns = [
    {
      title: t("reports.orderNumber", "Order #"),
      dataIndex: "order_number",
      key: "order_number",
      width: 140,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: t("reports.date", "Date"),
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: t("reports.customer", "Customer"),
      key: "customer",
      ellipsis: true,
      render: (_, row) => (
        <div>
          <div className="font-medium text-slate-800">
            {row.customer_name || "—"}
          </div>
          {(row.user?.phone || row.shipping_address?.phone) && (
            <div className="text-xs text-slate-400">
              {row.user?.phone || row.shipping_address?.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("reports.status", "Status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={STATUS_TAG_COLORS[status] || "default"}>
          {t(`orderStatus.${status}`, status)}
        </Tag>
      ),
    },
    {
      title: t("reports.payment", "Payment"),
      dataIndex: "payment_status",
      key: "payment_status",
      width: 110,
      render: (status) => (
        <Tag color={PAYMENT_TAG_COLORS[status] || "default"}>
          {t(`paymentStatus.${status}`, status)}
        </Tag>
      ),
    },
    {
      title: t("reports.items", "Items"),
      dataIndex: "items_count",
      key: "items_count",
      width: 80,
      align: "right",
      render: (v) => <span className="tabular-nums">{v ?? 0}</span>,
    },
    {
      title: t("reports.total", "Total"),
      dataIndex: "total",
      key: "total",
      width: 120,
      align: "right",
      render: (v) => (
        <span className="font-medium tabular-nums text-slate-800">
          {money(v)}
        </span>
      ),
    },
  ];

  const topProductColumns = [
    {
      title: "#",
      key: "rank",
      width: 48,
      render: (_, __, index) => (
        <span className="text-slate-400">{index + 1}</span>
      ),
    },
    {
      title: t("reports.product", "Product"),
      key: "product",
      ellipsis: true,
      render: (_, row) => (
        <div>
          <div className="truncate font-medium text-slate-800">{row.name}</div>
          {row.sku && <div className="text-xs text-slate-400">{row.sku}</div>}
        </div>
      ),
    },
    {
      title: t("reports.qtySold", "Qty sold"),
      dataIndex: "quantity_sold",
      key: "quantity_sold",
      width: 90,
      align: "right",
      render: (v) => <span className="tabular-nums">{v}</span>,
    },
    {
      title: t("reports.revenue", "Revenue"),
      dataIndex: "revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (v) => (
        <span className="font-medium tabular-nums">{money(v)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1 !text-slate-800">
            {t("reports.title", "Reports")}
          </Title>
          <Text type="secondary">
            {t(
              "reports.subtitle",
              "Sales overview, order analytics and export",
            )}
          </Text>
        </div>
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              summaryQuery.refetch();
              ordersQuery.refetch();
              topProductsQuery.refetch();
              dailyQuery.refetch();
            }}
          >
            {t("common.refresh", "Refresh")}
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
          >
            {t("reports.exportExcel", "Export Excel")}
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card bordered={false} className="!rounded-2xl !shadow-sm" size="small">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">
              <FilterOutlined className="mr-1" />
              {t("reports.dateRange", "Date range")}
            </div>
            <RangePicker
              value={filters.range}
              onChange={(val) => handleFilterChange("range", val)}
              allowClear={false}
              format="YYYY-MM-DD"
              className="w-full min-w-[260px]"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">
              {t("reports.orderStatus", "Order status")}
            </div>
            <Select
              allowClear
              placeholder={t("reports.allStatuses", "All statuses")}
              value={filters.status}
              onChange={(val) => handleFilterChange("status", val)}
              style={{ minWidth: 150 }}
              options={[
                {
                  value: "pending",
                  label: t("orderStatus.pending", "Pending"),
                },
                {
                  value: "confirmed",
                  label: t("orderStatus.confirmed", "Confirmed"),
                },
                {
                  value: "processing",
                  label: t("orderStatus.processing", "Processing"),
                },
                {
                  value: "shipped",
                  label: t("orderStatus.shipped", "Shipped"),
                },
                {
                  value: "delivered",
                  label: t("orderStatus.delivered", "Delivered"),
                },
                {
                  value: "cancelled",
                  label: t("orderStatus.cancelled", "Cancelled"),
                },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">
              {t("reports.paymentStatus", "Payment status")}
            </div>
            <Select
              allowClear
              placeholder={t("reports.allPayments", "All payments")}
              value={filters.payment_status}
              onChange={(val) => handleFilterChange("payment_status", val)}
              style={{ minWidth: 150 }}
              options={[
                {
                  value: "pending",
                  label: t("paymentStatus.pending", "Pending"),
                },
                { value: "paid", label: t("paymentStatus.paid", "Paid") },
                {
                  value: "failed",
                  label: t("paymentStatus.failed", "Failed"),
                },
                {
                  value: "refunded",
                  label: t("paymentStatus.refunded", "Refunded"),
                },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">
              {t("reports.paymentMethod", "Payment method")}
            </div>
            <Select
              allowClear
              placeholder={t("reports.allMethods", "All methods")}
              value={filters.payment_method}
              onChange={(val) => handleFilterChange("payment_method", val)}
              style={{ minWidth: 130 }}
              options={[
                { value: "cash", label: t("paymentMethod.cash", "Cash") },
                { value: "card", label: t("paymentMethod.card", "Card") },
              ]}
            />
          </div>

          <Button onClick={resetFilters}>{t("common.reset", "Reset")}</Button>
        </div>
      </Card>

      {/* KPI cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="!rounded-2xl !shadow-sm">
            <Statistic
              title={t("reports.totalRevenue", "Total revenue")}
              value={summary.total_revenue || 0}
              precision={2}
              suffix="TMT"
              prefix={<DollarOutlined className="text-emerald-500" />}
              valueStyle={{ color: "#059669" }}
              loading={summaryQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="!rounded-2xl !shadow-sm">
            <Statistic
              title={t("reports.totalOrders", "Total orders")}
              value={summary.total_orders || 0}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
              loading={summaryQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="!rounded-2xl !shadow-sm">
            <Statistic
              title={t("reports.itemsSold", "Items sold")}
              value={summary.items_sold || 0}
              prefix={<BarChartOutlined className="text-violet-500" />}
              loading={summaryQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="!rounded-2xl !shadow-sm">
            <Statistic
              title={t("reports.avgOrderValue", "Avg. order value")}
              value={summary.avg_order_value || 0}
              precision={2}
              suffix="TMT"
              prefix={<RiseOutlined className="text-amber-500" />}
              loading={summaryQuery.isLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Daily trend chart */}
      <Card
        bordered={false}
        className="!rounded-2xl !shadow-sm"
        title={
          <span className="font-semibold text-slate-800">
            {t("reports.dailyTrend", "Daily trend")}
          </span>
        }
      >
        {dailyChartData.length > 0 ? (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyChartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v) =>
                        typeof v === "number" && v > 50
                          ? money(v)
                          : Number(v).toLocaleString()
                      }
                    />
                  }
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.fullDate || ""
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
                  iconType="circle"
                />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  name={t("reports.revenue", "Revenue")}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
                <Area
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  name={t("reports.orders", "Orders")}
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorOrders)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("reports.noData", "No data for this period")}
          />
        )}
      </Card>

      {/* Status + Payment pie charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className="!rounded-2xl !shadow-sm h-full"
            title={
              <span className="font-semibold text-slate-800">
                {t("reports.ordersByStatus", "Orders by status")}
              </span>
            }
          >
            {statusChartData.length > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-[240px] w-full max-w-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {statusChartData.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <ChartTooltip
                            valueFormatter={(v) => Number(v).toLocaleString()}
                          />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {statusChartData.map((item) => {
                    const total = summary.total_orders || 1;
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div
                        key={item.status}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: item.color }}
                          />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="tabular-nums text-slate-800">
                          {item.value}{" "}
                          <span className="text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t("reports.noData", "No data for this period")}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            bordered={false}
            className="!rounded-2xl !shadow-sm h-full"
            title={
              <span className="font-semibold text-slate-800">
                {t("reports.ordersByPayment", "Orders by payment")}
              </span>
            }
          >
            {paymentChartData.length > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-[240px] w-full max-w-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {paymentChartData.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <ChartTooltip
                            valueFormatter={(v) => Number(v).toLocaleString()}
                          />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {paymentChartData.map((item) => {
                    const total = summary.total_orders || 1;
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div
                        key={item.status}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: item.color }}
                          />
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="tabular-nums text-slate-800">
                          {item.value}{" "}
                          <span className="text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t("reports.noData", "No data for this period")}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Top products bar chart + table */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            className="!rounded-2xl !shadow-sm h-full"
            title={
              <span className="font-semibold text-slate-800">
                {t("reports.topProductsChart", "Top products by revenue")}
              </span>
            }
          >
            {topProductsChartData.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProductsChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip valueFormatter={(v) => money(v)} />
                      }
                      cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    />
                    <Bar
                      dataKey="revenue"
                      name={t("reports.revenue", "Revenue")}
                      fill="#3b82f6"
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                    >
                      {topProductsChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t("reports.noData", "No data for this period")}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            className="!rounded-2xl !shadow-sm h-full"
            title={
              <span className="font-semibold text-slate-800">
                {t("reports.topProducts", "Top products")}
              </span>
            }
          >
            <Table
              rowKey="product_id"
              size="small"
              loading={topProductsQuery.isLoading}
              columns={topProductColumns}
              dataSource={topProducts}
              pagination={false}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t("reports.noData", "No data for this period")}
                  />
                ),
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Orders table */}
      <Card
        bordered={false}
        className="!rounded-2xl !shadow-sm"
        title={
          <span className="font-semibold text-slate-800">
            {t("reports.ordersList", "Orders")}
          </span>
        }
      >
        <Table
          rowKey="id"
          loading={ordersQuery.isLoading}
          columns={orderColumns}
          dataSource={orders}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize,
            total: totalOrders,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) =>
              t("reports.totalCount", "{{count}} orders", { count: total }),
            onChange: (p, size) => {
              setPage(p);
              setPageSize(size);
            },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t("reports.noData", "No data for this period")}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}
