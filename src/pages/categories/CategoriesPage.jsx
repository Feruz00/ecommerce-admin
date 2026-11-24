import { useMemo, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Space,
  Typography,
  Spin,
  Popconfirm,
  Upload,
  Image,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/functions";

const { Title } = Typography;

async function uploadImage(file) {
  const fd = new FormData();

  fd.append("image", file);
  fd.append("entity_type", "categories");
  fd.append("is_primary", "true");

  const { data } = await api.post("/files/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.data.file;
}

function getCategoryName(category, language) {
  return (
    category?.translations?.[language]?.name ||
    category?.translations?.en?.name ||
    category?.name ||
    `#${category?.id}`
  );
}

function flattenCategories(categories, result = []) {
  (categories || []).forEach((category) => {
    result.push(category);

    if (category.children?.length) {
      flattenCategories(category.children, result);
    }
  });

  return result;
}

function getDescendantIds(category) {
  const ids = new Set();

  const walk = (item) => {
    (item.children || []).forEach((child) => {
      ids.add(child.id);
      walk(child);
    });
  };

  walk(category);
  return ids;
}

export default function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.slice(0, 2) || "en";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories").then((res) => res.data),
  });

  const invalidateCategories = () =>
    qc.invalidateQueries({ queryKey: ["admin-categories"] });

  const createMut = useMutation({
    mutationFn: (values) => api.post("/categories", values),
    onSuccess: () => {
      invalidateCategories();
      message.success(t("categories.created"));
      setOpen(false);
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("categories.createFailed"),
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...values }) => api.patch(`/categories/${id}`, values),
    onSuccess: () => {
      invalidateCategories();
      message.success(t("categories.updated"));
      setOpen(false);
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("categories.updateFailed"),
      );
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      invalidateCategories();
      message.success(t("categories.deleted"));
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("categories.deleteFailed"),
      );
    },
  });

  // The API returns a nested category tree.
  const categories = data?.data?.categories || [];

  const allCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  // Exclude the current category and all its descendants from parent options.
  const parentOptions = useMemo(() => {
    const excludedIds = editing ? getDescendantIds(editing) : new Set();

    if (editing) excludedIds.add(editing.id);

    return allCategories
      .filter((category) => !excludedIds.has(category.id))
      .map((category) => ({
        value: category.id,
        label: `${"— ".repeat(
          getCategoryDepth(category, categories),
        )}${getCategoryName(category, language)}`,
      }));
  }, [allCategories, editing, categories, language]);

  function openForm(record = null) {
    setEditing(record);
    setPreviewUrl(record?.image || "");

    form.resetFields();

    if (record) {
      form.setFieldsValue({
        parent_id: record.parent_id ?? undefined,
        sort_order: record.sort_order ?? 0,
        is_active: record.is_active,
        name_en: record.translations?.en?.name || "",
        name_tm: record.translations?.tm?.name || "",
        name_ru: record.translations?.ru?.name || "",
        image_file_id: record.image_file_id || undefined,
      });
    } else {
      form.setFieldsValue({
        is_active: true,
        sort_order: 0,
        parent_id: undefined,
        image_file_id: undefined,
      });
    }

    setOpen(true);
  }

  async function handleUpload(file) {
    setUploading(true);

    try {
      const uploaded = await uploadImage(file);

      form.setFieldsValue({
        image_file_id: uploaded.id,
      });

      setPreviewUrl(uploaded.url);

      message.success(t("categories.imageUploaded"));
    } catch (error) {
      message.error(
        error.response?.data?.message || t("categories.uploadFailed"),
      );
    } finally {
      setUploading(false);
    }

    return false;
  }

  function onFinish(values) {
    const payload = {
      parent_id: values.parent_id || null,
      sort_order: values.sort_order ?? 0,
      is_active: values.is_active ?? true,
      image_file_id: values.image_file_id || null,
      translations: {
        en: {
          name: values.name_en.trim(),
        },
        tm: {
          name: values.name_tm?.trim() || values.name_en.trim(),
        },
        ru: {
          name: values.name_ru?.trim() || values.name_en.trim(),
        },
      },
    };

    if (editing) {
      updateMut.mutate({
        id: editing.id,
        ...payload,
      });
    } else {
      createMut.mutate(payload);
    }
  }

  const columns = [
    {
      title: t("categories.name"),
      key: "name",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          {record.image && (
            <Image
              src={
                record.image.startsWith("/uploads")
                  ? getImageUrl(record.image)
                  : record.image
              }
              width={36}
              height={36}
              className="rounded object-cover"
              preview
            />
          )}

          <span className="font-medium">
            {getCategoryName(record, language)}
          </span>
        </div>
      ),
    },
    {
      title: t("categories.status"),
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (value) => (
        <Tag color={value ? "green" : "red"}>
          {value ? t("categories.active") : t("categories.inactive")}
        </Tag>
      ),
    },
    {
      title: t("categories.sortOrder"),
      dataIndex: "sort_order",
      key: "sort_order",
      width: 120,
    },
    {
      title: t("categories.actions"),
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openForm(record)}
          />

          <Popconfirm
            title={t("categories.deleteConfirm")}
            description={t("categories.deleteDescription")}
            okText={t("categories.delete")}
            cancelText={t("categories.cancel")}
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMut.mutate(record.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMut.isPending && deleteMut.variables === record.id}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 gap-3">
        <Title level={3} className="!mb-0">
          {t("categories.title")}
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openForm()}
        >
          {t("categories.addCategory")}
        </Button>
      </div>

      {isLoading ? (
        <Spin className="flex justify-center py-20" size="large" />
      ) : (
        <Table
          dataSource={categories}
          rowKey="id"
          columns={columns}
          pagination={false}
          childrenColumnName="children"
          expandable={{
            defaultExpandAllRows: true,
          }}
          locale={{
            emptyText: t("categories.noCategories"),
          }}
        />
      )}

      <Modal
        title={
          editing
            ? t("categories.editCategory")
            : t("categories.createCategory")
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? t("categories.update") : t("categories.create")}
        cancelText={t("categories.cancel")}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="mt-4"
        >
          <Form.Item
            name="name_en"
            label={t("categories.nameEn")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("categories.nameRequired"),
              },
            ]}
          >
            <Input placeholder={t("categories.enterName")} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="name_tm" label={t("categories.nameTm")}>
              <Input placeholder={t("categories.enterName")} />
            </Form.Item>

            <Form.Item name="name_ru" label={t("categories.nameRu")}>
              <Input placeholder={t("categories.enterName")} />
            </Form.Item>
          </div>

          <Form.Item name="parent_id" label={t("categories.parentCategory")}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={parentOptions}
              placeholder={t("categories.noParent")}
            />
          </Form.Item>

          <Form.Item name="sort_order" label={t("categories.sortOrder")}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>

          <Form.Item name="image_file_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item label={t("categories.image")}>
            <div className="flex items-center gap-3">
              {previewUrl && (
                <Image
                  src={
                    previewUrl.startsWith("/uploads")
                      ? getImageUrl(previewUrl)
                      : previewUrl
                  }
                  width={64}
                  height={64}
                  className="rounded object-cover"
                />
              )}

              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleUpload}
                disabled={uploading}
              >
                <Button
                  icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
                  loading={uploading}
                >
                  {t("categories.upload")}
                </Button>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item
            name="is_active"
            label={t("categories.active")}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// Find the nesting depth of a category in the tree.
function getCategoryDepth(category, categories, depth = 0) {
  for (const item of categories || []) {
    if (item.id === category.id) return depth;

    const found = getCategoryDepth(category, item.children || [], depth + 1);

    if (found !== -1) return found;
  }

  return -1;
}
