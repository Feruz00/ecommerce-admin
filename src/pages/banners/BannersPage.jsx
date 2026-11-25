import { useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Space,
  Typography,
  Spin,
  Popconfirm,
  Upload,
  Image,
  message,
  Empty,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  LoadingOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";
import { getImageUrl } from "../../utils/functions";

const { Title, Text } = Typography;
const { TextArea } = Input;

async function uploadImage(file) {
  const fd = new FormData();

  fd.append("image", file);
  fd.append("entity_type", "banners");
  fd.append("is_primary", "true");

  const { data } = await api.post("/files/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.data.file;
}

export default function BannersPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.slice(0, 2) || "en";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");

  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: () => api.get("/banners").then((res) => res.data),
  });

  const banners = data?.data?.banners || [];

  const invalidateBanners = () =>
    qc.invalidateQueries({ queryKey: ["admin-banners"] });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    setPreview("");
    form.resetFields();
  };

  const createMut = useMutation({
    mutationFn: (values) => api.post("/banners", values),
    onSuccess: () => {
      invalidateBanners();
      message.success(t("banners.created"));
      closeForm();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || t("banners.createFailed"));
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...values }) => api.patch(`/banners/${id}`, values),
    onSuccess: () => {
      invalidateBanners();
      message.success(t("banners.updated"));
      closeForm();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || t("banners.updateFailed"));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/banners/${id}`),
    onSuccess: () => {
      invalidateBanners();
      message.success(t("banners.deleted"));
    },
    onError: (error) => {
      message.error(error.response?.data?.message || t("banners.deleteFailed"));
    },
  });

  function getBannerTitle(record) {
    return (
      record.translations?.[language]?.title ||
      record.translations?.en?.title ||
      record.translations?.ru?.title ||
      record.translations?.tm?.title ||
      "—"
    );
  }

  function getBannerText(record) {
    return (
      record.translations?.[language]?.text ||
      record.translations?.en?.text ||
      record.translations?.ru?.text ||
      record.translations?.tm?.text ||
      ""
    );
  }

  function openForm(record = null) {
    setEditing(record);
    setPreview(record?.image || record?.imageFile?.url || "");

    form.resetFields();

    if (record) {
      form.setFieldsValue({
        link: record.link || "",
        sort_order: record.sort_order ?? 0,
        is_active: record.is_active ?? true,

        title_en: record.translations?.en?.title || "",
        text_en: record.translations?.en?.text || "",

        title_tm: record.translations?.tm?.title || "",
        text_tm: record.translations?.tm?.text || "",

        title_ru: record.translations?.ru?.title || "",
        text_ru: record.translations?.ru?.text || "",

        image_file_id: record.image_file_id || undefined,
      });
    } else {
      form.setFieldsValue({
        is_active: true,
        sort_order: 0,
      });
    }

    setOpen(true);
  }

  async function handleUpload(file) {
    if (!file.type?.startsWith("image/")) {
      message.error(t("banners.invalidImage"));
      return false;
    }

    setUploading(true);

    try {
      const uploaded = await uploadImage(file);

      form.setFieldsValue({
        image_file_id: uploaded.id,
      });

      setPreview(uploaded.url);

      message.success(t("banners.imageUploaded"));
    } catch (error) {
      message.error(error.response?.data?.message || t("banners.uploadFailed"));
    } finally {
      setUploading(false);
    }

    return false;
  }

  function onFinish(values) {
    if (uploading) return;

    const englishTitle = values.title_en?.trim() || "";
    const englishText = values.text_en?.trim() || "";

    const payload = {
      link: values.link?.trim() || null,
      sort_order: values.sort_order ?? 0,
      is_active: values.is_active ?? true,
      image_file_id: values.image_file_id || null,

      translations: {
        en: {
          title: englishTitle,
          text: englishText,
        },
        tm: {
          title: values.title_tm?.trim() || englishTitle,
          text: values.text_tm?.trim() || englishText,
        },
        ru: {
          title: values.title_ru?.trim() || englishTitle,
          text: values.text_ru?.trim() || englishText,
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
      title: t("banners.image"),
      key: "image",
      width: 120,
      render: (_, record) => {
        const url = record.image || record.imageFile?.url;

        return url ? (
          <Image
            src={url.startsWith("/uploads") ? getImageUrl(url) : url}
            width={80}
            height={48}
            className="rounded object-cover"
            preview
          />
        ) : (
          <div className="flex h-12 w-20 items-center justify-center rounded bg-gray-100 text-gray-400">
            <PictureOutlined className="text-xl" />
          </div>
        );
      },
    },
    // {
    //   title: t("banners.title"),
    //   key: "title",
    //   render: (_, record) => (
    //     <div className="min-w-40">
    //       <div className="font-medium">{getBannerTitle(record)}</div>

    //       {getBannerText(record) && (
    //         <Text type="secondary" className="text-xs">
    //           {getBannerText(record)}
    //         </Text>
    //       )}
    //     </div>
    //   ),
    // },
    {
      title: t("banners.link"),
      dataIndex: "link",
      key: "link",
      render: (value) => (
        <Text type="secondary" className="text-xs">
          {value || "—"}
        </Text>
      ),
    },
    {
      title: t("banners.sortOrder"),
      dataIndex: "sort_order",
      key: "sort_order",
      width: 110,
    },
    {
      title: t("banners.status"),
      dataIndex: "is_active",
      key: "is_active",
      width: 110,
      render: (value) => <TagStatus active={value} t={t} />,
    },
    {
      title: t("banners.actions"),
      key: "actions",
      width: 110,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openForm(record)}
          />

          <Popconfirm
            title={t("banners.deleteConfirm")}
            description={t("banners.deleteDescription")}
            okText={t("banners.delete")}
            cancelText={t("banners.cancel")}
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

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Title level={3} className="!mb-0">
          {t("banners.title")}
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openForm()}
        >
          {t("banners.addBanner")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-red-500">
          {t("banners.loadFailed")}
        </div>
      ) : (
        <Table
          rowKey="id"
          dataSource={banners}
          pagination={false}
          scroll={{ x: 750 }}
          columns={columns}
          locale={{
            emptyText: <Empty description={t("banners.noBanners")} />,
          }}
        />
      )}

      <Modal
        title={editing ? t("banners.editBanner") : t("banners.createBanner")}
        open={open}
        onCancel={closeForm}
        onOk={() => form.submit()}
        okText={editing ? t("banners.update") : t("banners.create")}
        cancelText={t("banners.cancel")}
        confirmLoading={saving || uploading}
        okButtonProps={{
          disabled: uploading,
        }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="mt-4"
        >
          {/* <Form.Item
            name="title_en"
            label={t("banners.titleEn")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("banners.titleRequired"),
              },
            ]}
          >
            <Input maxLength={255} />
          </Form.Item>

          <Form.Item name="text_en" label={t("banners.textEn")}>
            <TextArea rows={3} maxLength={1000} />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item name="title_tm" label={t("banners.titleTm")}>
              <Input maxLength={255} />
            </Form.Item>

            <Form.Item name="title_ru" label={t("banners.titleRu")}>
              <Input maxLength={255} />
            </Form.Item>
          </div> */}

          {/* <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item name="text_tm" label={t("banners.textTm")}>
              <TextArea rows={3} maxLength={1000} />
            </Form.Item>

            <Form.Item name="text_ru" label={t("banners.textRu")}>
              <TextArea rows={3} maxLength={1000} />
            </Form.Item>
          </div> */}

          <Form.Item name="link" label={t("banners.link")}>
            <Input placeholder="/products" maxLength={500} />
          </Form.Item>

          <Form.Item name="sort_order" label={t("banners.sortOrder")}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>

          <Form.Item name="image_file_id" hidden>
            <Input />
          </Form.Item>

          <Form.Item label={t("banners.image")}>
            <div className="flex flex-wrap items-center gap-3">
              {preview ? (
                <Image
                  src={
                    preview.startsWith("/uploads")
                      ? getImageUrl(preview)
                      : preview
                  }
                  width={120}
                  height={64}
                  className="rounded object-cover"
                  preview
                />
              ) : (
                <div className="flex h-16 w-30 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                  <PictureOutlined className="text-2xl" />
                </div>
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
                  disabled={uploading}
                >
                  {t("banners.upload")}
                </Button>
              </Upload>
            </div>
          </Form.Item>

          <Form.Item
            name="is_active"
            label={t("banners.active")}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function TagStatus({ active, t }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-1 text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {active ? t("banners.active") : t("banners.inactive")}
    </span>
  );
}
