import { Card, Col, Row, Statistic, Table, Tag, Typography, Spin } from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../api/axios';

const { Title } = Typography;

const statusColors = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  const stats = data?.data?.stats || {};
  const recentOrders = data?.data?.recentOrders || [];
  const lowStock = data?.data?.lowStock || [];

  return (
    <div>
      <Title level={3}>Dashboard</Title>
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Customers" value={stats.customers || 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Products" value={stats.products || 0} prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Orders" value={stats.orders || 0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue"
              value={stats.revenue || 0}
              prefix={<DollarOutlined />}
              suffix="TMT"
              precision={0}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Recent orders">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={recentOrders}
              columns={[
                {
                  title: 'Order',
                  dataIndex: 'order_number',
                  render: (v) => <code>{v}</code>,
                },
                {
                  title: 'Customer',
                  render: (_, r) =>
                    r.user ? `${r.user.first_name} ${r.user.last_name}` : '—',
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  render: (v) => `${Number(v).toLocaleString()} TMT`,
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  render: (s) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>,
                },
                {
                  title: 'Date',
                  dataIndex: 'created_at',
                  render: (d) => (d ? dayjs(d).format('DD MMM HH:mm') : '—'),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Low stock">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={lowStock}
              columns={[
                {
                  title: 'SKU',
                  dataIndex: 'sku',
                },
                {
                  title: 'Name',
                  render: (_, r) =>
                    r.translations?.en?.name || r.translations?.ru?.name || r.slug,
                },
                {
                  title: 'Qty',
                  dataIndex: 'quantity',
                  render: (q) => <Tag color={q === 0 ? 'red' : 'orange'}>{q}</Tag>,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
