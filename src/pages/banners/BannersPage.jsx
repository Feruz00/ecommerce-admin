import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Switch, Space, Typography,
  Spin, Popconfirm, Upload, Image, message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const { Title } = Typography;

async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  fd.append('entity_type', 'banners');
  fd.append('is_primary', 'true');
  const { data } = await api.post('/files/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.file;
}

export default function BannersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState('');
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => api.get('/banners').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (v) => api.post('/banners', v),
    onSuccess: () => {
      qc.invalidateQueries(['admin-banners']);
      message.success('Created');
      setOpen(false);
    },
    onError: (e) => message.error(e.response?.data?.message || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...v }) => api.patch(`/banners/${id}`, v),
    onSuccess: () => {
      qc.invalidateQueries(['admin-banners']);
      message.success('Updated');
      setOpen(false);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-banners']);
      message.success('Deleted');
    },
  });

  const banners = data?.data?.banners || [];

  const openForm = (record) => {
    setEditing(record || null);
    setPreview(record?.imageFile?.url || record?.image || '');
    if (record) {
      form.setFieldsValue({
        link: record.link,
        sort_order: record.sort_order,
        is_active: record.is_active,
        title_en: record.translations?.en?.title,
        title_tm: record.translations?.tm?.title,
        title_ru: record.translations?.ru?.title,
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
      setPreview(uploaded.url);
      message.success('Uploaded');
    } catch (e) {
      message.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const onFinish = (v) => {
    const payload = {
      link: v.link,
      sort_order: v.sort_order || 0,
      is_active: v.is_active,
      image_file_id: v.image_file_id || null,
      translations: {
        en: { title: v.title_en },
        tm: { title: v.title_tm || v.title_en },
        ru: { title: v.title_ru || v.title_en },
      },
    };
    if (editing) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Banners</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
          Add Banner
        </Button>
      </div>

      {isLoading ? (
        <Spin className="flex justify-center py-20" size="large" />
      ) : (
        <Table
          rowKey="id"
          dataSource={banners}
          pagination={false}
          columns={[
            {
              title: 'Image',
              render: (_, r) => {
                const url = r.imageFile?.url || r.image;
                return url ? (
                  <Image src={url} width={80} height={40} className="object-cover rounded" />
                ) : (
                  '—'
                );
              },
            },
            {
              title: 'Title',
              render: (_, r) =>
                r.translations?.en?.title || r.translations?.ru?.title || '—',
            },
            { title: 'Link', dataIndex: 'link' },
            { title: 'Order', dataIndex: 'sort_order', width: 80 },
            {
              title: 'Active',
              dataIndex: 'is_active',
              render: (v) => (v ? 'Yes' : 'No'),
            },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} />
                  <Popconfirm title="Delete banner?" onConfirm={() => deleteMut.mutate(r.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      )}

      <Modal
        title={editing ? 'Edit Banner' : 'Create Banner'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4">
          <Form.Item name="title_en" label="Title (EN)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="title_tm" label="Title (TM)">
              <Input />
            </Form.Item>
            <Form.Item name="title_ru" label="Title (RU)">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="link" label="Link">
            <Input placeholder="/products" />
          </Form.Item>
          <Form.Item name="sort_order" label="Sort order">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="image_file_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="Image">
            <div className="flex items-center gap-3">
              {preview && <Image src={preview} width={96} height={48} className="object-cover rounded" />}
              <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload} disabled={uploading}>
                <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading}>
                  Upload
                </Button>
              </Upload>
            </div>
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
