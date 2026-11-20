import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Space,
  Typography, Spin, Popconfirm, Tag, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const { Title } = Typography;

export default function AttributesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const type = Form.useWatch('type', form);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-attributes'],
    queryFn: () =>
      api.get('/attributes', { params: { include_inactive: 'true' } }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (v) => api.post('/attributes', v),
    onSuccess: () => {
      qc.invalidateQueries(['admin-attributes']);
      message.success('Created');
      setOpen(false);
    },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...v }) => api.patch(`/attributes/${id}`, v),
    onSuccess: () => {
      qc.invalidateQueries(['admin-attributes']);
      message.success('Updated');
      setOpen(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/attributes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-attributes']);
      message.success('Deleted');
    },
  });

  const attributes = data?.data?.attributes || [];

  const openForm = (record) => {
    setEditing(record || null);
    if (record) {
      form.setFieldsValue({
        code: record.code,
        type: record.type,
        scope: record.scope,
        unit: record.unit,
        sort_order: record.sort_order,
        is_filterable: record.is_filterable,
        is_required: record.is_required,
        is_active: record.is_active,
        name_en: record.translations?.en?.name || record.name,
        name_tm: record.translations?.tm?.name,
        name_ru: record.translations?.ru?.name,
        options: (record.options || []).map((o) => ({
          value: o.value,
          color_hex: o.color_hex,
          label_en: o.translations?.en?.label || o.label || o.value,
          label_tm: o.translations?.tm?.label,
          label_ru: o.translations?.ru?.label,
        })),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        type: 'select',
        scope: 'product',
        is_filterable: true,
        is_active: true,
        sort_order: 0,
        options: [],
      });
    }
    setOpen(true);
  };

  const onFinish = (v) => {
    const payload = {
      code: v.code,
      type: v.type,
      scope: v.scope,
      unit: v.unit,
      sort_order: v.sort_order || 0,
      is_filterable: v.is_filterable,
      is_required: v.is_required,
      is_active: v.is_active,
      translations: {
        en: { name: v.name_en },
        tm: { name: v.name_tm || v.name_en },
        ru: { name: v.name_ru || v.name_en },
      },
      options: (v.options || []).map((o, i) => ({
        value: o.value,
        color_hex: o.color_hex || null,
        sort_order: i,
        translations: {
          en: { label: o.label_en || o.value },
          tm: { label: o.label_tm || o.label_en || o.value },
          ru: { label: o.label_ru || o.label_en || o.value },
        },
      })),
    };
    if (editing) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Attributes (EAV)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
          Add Attribute
        </Button>
      </div>

      {isLoading ? (
        <Spin className="flex justify-center py-20" size="large" />
      ) : (
        <Table
          rowKey="id"
          dataSource={attributes}
          pagination={false}
          columns={[
            { title: 'Code', dataIndex: 'code', render: (v) => <code>{v}</code> },
            {
              title: 'Name',
              render: (_, r) => r.name || r.translations?.en?.name,
            },
            {
              title: 'Type',
              dataIndex: 'type',
              render: (v) => <Tag>{v}</Tag>,
            },
            { title: 'Scope', dataIndex: 'scope' },
            {
              title: 'Filterable',
              dataIndex: 'is_filterable',
              render: (v) => (v ? 'Yes' : 'No'),
            },
            {
              title: 'Options',
              render: (_, r) => r.options?.length || 0,
            },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} />
                  <Popconfirm title="Delete attribute and values?" onConfirm={() => deleteMut.mutate(r.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        title={editing ? 'Edit Attribute' : 'Create Attribute'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input placeholder="brand" disabled={!!editing} />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'number', label: 'Number' },
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'select', label: 'Select' },
                  { value: 'color', label: 'Color' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="name_en" label="Name (EN)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="name_tm" label="Name (TM)">
              <Input />
            </Form.Item>
            <Form.Item name="name_ru" label="Name (RU)">
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="scope" label="Scope">
              <Select
                options={[
                  { value: 'product', label: 'Product' },
                  { value: 'variant', label: 'Variant' },
                  { value: 'both', label: 'Both' },
                ]}
              />
            </Form.Item>
            <Form.Item name="unit" label="Unit">
              <Input placeholder="GB, g, cm" />
            </Form.Item>
            <Form.Item name="sort_order" label="Sort">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="is_filterable" label="Filterable" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_required" label="Required" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          {['select', 'color'].includes(type) && (
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <div className="border rounded-lg p-3 mb-4">
                  <div className="flex justify-between mb-2">
                    <strong>Options</strong>
                    <Button size="small" onClick={() => add()}>
                      + Option
                    </Button>
                  </div>
                  {fields.map((field) => (
                    <Space key={field.key} align="baseline" className="mb-2 flex flex-wrap">
                      <Form.Item {...field} name={[field.name, 'value']} rules={[{ required: true }]}>
                        <Input placeholder="value" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'label_en']}>
                        <Input placeholder="Label EN" />
                      </Form.Item>
                      {type === 'color' && (
                        <Form.Item {...field} name={[field.name, 'color_hex']}>
                          <Input placeholder="#hex" style={{ width: 90 }} />
                        </Form.Item>
                      )}
                      <Button danger size="small" onClick={() => remove(field.name)}>
                        ×
                      </Button>
                    </Space>
                  ))}
                </div>
              )}
            </Form.List>
          )}
        </Form>
      </Modal>
    </div>
  );
}
