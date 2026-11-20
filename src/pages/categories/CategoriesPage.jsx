import { useState } from 'react';
import {
  Table, Button, Tag, Modal, Form, Input, InputNumber, Select, Switch,
  Space, Typography, Spin, Popconfirm, Upload, Image, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const { Title } = Typography;

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('entity_type', 'categories');
  fd.append('is_primary', 'true');
  const { data } = await api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.data.file;
}

export default function CategoriesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (v) => api.post('/categories', v),
    onSuccess: () => { qc.invalidateQueries(['admin-categories']); message.success('Created'); setOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...v }) => api.patch(`/categories/${id}`, v),
    onSuccess: () => { qc.invalidateQueries(['admin-categories']); message.success('Updated'); setOpen(false); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries(['admin-categories']); message.success('Deleted'); },
  });

  const categories = data?.data?.categories || [];
  // Flatten tree for table
  const flat = [];
  const walk = (list, level = 0) => {
    (list || []).forEach((c) => {
      flat.push({ ...c, level });
      if (c.children?.length) walk(c.children, level + 1);
    });
  };
  // categories from getAll might not be tree - handle both
  if (categories.some((c) => c.children)) walk(categories.filter((c) => !c.parent_id));
  else categories.forEach((c) => flat.push({ ...c, level: c.parent_id ? 1 : 0 }));

  const parentOptions = categories
    .filter((c) => !editing || c.id !== editing.id)
    .map((c) => ({ value: c.id, label: c.name || c.slug }));

  const openForm = (record) => {
    setEditing(record || null);
    setPreviewUrl(record?.image || '');
    if (record) {
      form.setFieldsValue({
        slug: record.slug,
        parent_id: record.parent_id,
        sort_order: record.sort_order,
        is_active: record.is_active,
        name_en: record.translations?.en?.name || record.name,
        name_tm: record.translations?.tm?.name,
        name_ru: record.translations?.ru?.name,
        image_file_id: record.image_file_id,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true, sort_order: 0 });
    }
    setOpen(true);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      form.setFieldsValue({ image_file_id: uploaded.id });
      setPreviewUrl(uploaded.url);
      message.success('Image uploaded');
    } catch (e) {
      message.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const onFinish = (v) => {
    const payload = {
      slug: v.slug,
      parent_id: v.parent_id || null,
      sort_order: v.sort_order || 0,
      is_active: v.is_active,
      image_file_id: v.image_file_id || null,
      translations: {
        en: { name: v.name_en },
        tm: { name: v.name_tm || v.name_en },
        ru: { name: v.name_ru || v.name_en },
      },
    };
    if (editing) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Categories</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>Add Category</Button>
      </div>
      {isLoading ? <Spin className="flex justify-center py-20" size="large" /> : (
        <Table
          dataSource={flat.length ? flat : categories}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: 'Name',
              render: (_, r) => (
                <span style={{ paddingLeft: (r.level || 0) * 20 }} className="font-medium">
                  {r.level > 0 ? '↳ ' : ''}{r.name || r.slug}
                </span>
              ),
            },
            { title: 'Slug', dataIndex: 'slug', render: (v) => <code className="text-xs bg-gray-100 px-1 rounded">{v}</code> },
            { title: 'Status', dataIndex: 'is_active', render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Off'}</Tag> },
            { title: 'Order', dataIndex: 'sort_order' },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} />
                  <Popconfirm title="Delete category?" onConfirm={() => deleteMut.mutate(r.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}
      <Modal title={editing ? 'Edit Category' : 'Create Category'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMut.isPending || updateMut.isPending} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name_en" label="Name (EN)" rules={[{ required: true }]}><Input /></Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="name_tm" label="Name (TM)"><Input /></Form.Item>
            <Form.Item name="name_ru" label="Name (RU)"><Input /></Form.Item>
          </div>
          <Form.Item name="parent_id" label="Parent Category">
            <Select allowClear options={parentOptions} placeholder="None (top level)" />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort Order"><InputNumber className="w-full" min={0} /></Form.Item>
          <Form.Item name="image_file_id" hidden><Input /></Form.Item>
          <Form.Item label="Image">
            <div className="flex items-center gap-3">
              {previewUrl && <Image src={previewUrl} width={64} height={64} className="rounded object-cover" />}
              <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload} disabled={uploading}>
                <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading}>Upload</Button>
              </Upload>
            </div>
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
