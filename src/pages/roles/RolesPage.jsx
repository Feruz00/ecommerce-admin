import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, Space, Typography, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from './hooks';

const { Title } = Typography;

const ALL_PERMISSIONS = [
  '*',
  'products.*', 'products.read', 'products.create', 'products.update', 'products.delete',
  'orders.*', 'orders.read', 'orders.update',
  'categories.*', 'users.*', 'users.read', 'users.create', 'users.update', 'users.delete',
  'roles.*', 'roles.read', 'roles.create', 'roles.update', 'roles.delete',
  'vendors.*', 'notifications.*', 'payments.*',
];

export default function RolesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const { data, isLoading } = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const roles = data?.data?.roles || [];

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ permissions: [] });
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      permissions: record.permissions || [],
    });
    setOpen(true);
  };

  const onFinish = (values) => {
    if (editing) {
      updateRole.mutate({ id: editing.id, ...values }, { onSuccess: () => setOpen(false) });
    } else {
      createRole.mutate(values, { onSuccess: () => setOpen(false) });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Roles & Permissions</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Role</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : (
        <Table
          dataSource={roles}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name', render: (v, r) => (
              <div>
                <span className="font-medium">{v}</span>
                {r.is_system && <Tag className="ml-2" color="purple">System</Tag>}
              </div>
            )},
            { title: 'Slug', dataIndex: 'slug', render: (v) => <code className="text-xs bg-gray-100 px-1 rounded">{v}</code> },
            { title: 'Users', dataIndex: 'user_count' },
            {
              title: 'Permissions',
              dataIndex: 'permissions',
              render: (perms) => (
                <div className="flex flex-wrap gap-1 max-w-md">
                  {(perms || []).slice(0, 5).map((p) => (
                    <Tag key={p} className="text-xs">{p}</Tag>
                  ))}
                  {(perms || []).length > 5 && <Tag>+{perms.length - 5}</Tag>}
                </div>
              ),
            },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                  {!r.is_system && (
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteRole.mutate(r.id)} />
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        title={editing ? 'Edit Role' : 'Create Role'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createRole.isPending || updateRole.isPending}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input disabled={editing?.is_system} placeholder="e.g. manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="Permissions">
            <Select
              mode="multiple"
              placeholder="Select permissions"
              options={ALL_PERMISSIONS.map((p) => ({ value: p, label: p }))}
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
