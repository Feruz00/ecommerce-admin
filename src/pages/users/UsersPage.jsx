import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, Space, Typography, Spin, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { message } from 'antd';

const { Title } = Typography;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => api.get('/users', { params: { page, limit: 15 } }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (v) => api.post('/users', v),
    onSuccess: () => { qc.invalidateQueries(['users']); message.success('Created'); setOpen(false); },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...v }) => api.patch(`/users/${id}`, v),
    onSuccess: () => { qc.invalidateQueries(['users']); message.success('Updated'); setOpen(false); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['users']); message.success('Deactivated'); },
  });
  const bulkMut = useMutation({
    mutationFn: (ids) => api.post('/users/bulk-delete', { ids }),
    onSuccess: () => { qc.invalidateQueries(['users']); setSelected([]); message.success('Deactivated'); },
  });

  const users = data?.data?.users || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Users</Title>
        <Space>
          {selected.length > 0 && (
            <Popconfirm title={`Deactivate ${selected.length} users?`} onConfirm={() => bulkMut.mutate(selected)}>
              <Button danger>Delete Selected ({selected.length})</Button>
            </Popconfirm>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ role: 'customer', status: 'active' }); setOpen(true); }}>
            Add User
          </Button>
        </Space>
      </div>
      {isLoading ? <Spin size="large" className="flex justify-center py-20" /> : (
        <Table
          rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
          dataSource={users} rowKey="id"
          pagination={{ current: page, total: data?.total, pageSize: 15, onChange: setPage }}
          columns={[
            { title: 'Name', render: (_, r) => <div><div className="font-medium">{r.first_name} {r.last_name}</div><div className="text-xs text-gray-400">{r.email}</div></div> },
            { title: 'Phone', dataIndex: 'phone', render: (v) => v || '—' },
            { title: 'Role', dataIndex: 'role', render: (v) => <Tag color={v === 'admin' ? 'red' : v === 'manager' ? 'blue' : 'default'}>{v}</Tag> },
            { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={v === 'active' ? 'green' : v === 'banned' ? 'red' : 'orange'}>{v}</Tag> },
            { title: 'Actions', render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }} />
                <Popconfirm title="Deactivate user?" onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            )},
          ]}
        />
      )}
      <Modal title={editing ? 'Edit User' : 'Create User'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMut.isPending || updateMut.isPending} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => editing ? updateMut.mutate({ id: editing.id, ...v }) : createMut.mutate(v)} className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          {!editing && <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>}
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={[{ value: 'admin' }, { value: 'manager' }, { value: 'customer' }]} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[{ value: 'active' }, { value: 'inactive' }, { value: 'banned' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
