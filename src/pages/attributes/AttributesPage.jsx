import { useState } from "react";
import {
  Table,
  Button,
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
  Tag,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";

const { Title } = Typography;

export default function AttributesPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.language?.slice(0, 2) || "en";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form] = Form.useForm();
  const qc = useQueryClient();
  const type = Form.useWatch("type", form);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-attributes"],
    queryFn: () =>
      api
        .get("/attributes", {
          params: { include_inactive: "true" },
        })
        .then((r) => r.data),
  });

  const attributes = data?.data?.attributes || [];

  const invalidateAttributes = () =>
    qc.invalidateQueries({ queryKey: ["admin-attributes"] });

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const createMut = useMutation({
    mutationFn: (values) => api.post("/attributes", values),
    onSuccess: () => {
      invalidateAttributes();
      message.success(t("attributes.created"));
      closeForm();
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("attributes.createFailed"),
      );
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...values }) => api.patch(`/attributes/${id}`, values),
    onSuccess: () => {
      invalidateAttributes();
      message.success(t("attributes.updated"));
      closeForm();
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("attributes.updateFailed"),
      );
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/attributes/${id}`),
    onSuccess: () => {
      invalidateAttributes();
      message.success(t("attributes.deleted"));
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("attributes.deleteFailed"),
      );
    },
  });

  function getTranslation(translations, field) {
    return (
      translations?.[language]?.[field] ||
      translations?.en?.[field] ||
      translations?.ru?.[field] ||
      translations?.tm?.[field] ||
      ""
    );
  }

  function getAttributeName(record) {
    return (
      getTranslation(record.translations, "name") || record.name || record.code
    );
  }

  function getOptionLabel(option) {
    return (
      getTranslation(option.translations, "label") ||
      option.label ||
      option.value
    );
  }

  function openForm(record = null) {
    setEditing(record);

    form.resetFields();

    if (record) {
      form.setFieldsValue({
        code: record.code,
        type: record.type,
        scope: record.scope,
        unit: record.unit,
        sort_order: record.sort_order ?? 0,
        is_filterable: record.is_filterable ?? false,
        is_required: record.is_required ?? false,
        is_active: record.is_active ?? true,

        name_en: record.translations?.en?.name || record.name || "",
        name_tm: record.translations?.tm?.name || "",
        name_ru: record.translations?.ru?.name || "",

        options: (record.options || []).map((option) => ({
          value: option.value,
          color_hex: option.color_hex,

          label_en:
            option.translations?.en?.label || option.label || option.value,

          label_tm: option.translations?.tm?.label || "",
          label_ru: option.translations?.ru?.label || "",
        })),
      });
    } else {
      form.setFieldsValue({
        type: "select",
        scope: "product",
        is_filterable: true,
        is_required: false,
        is_active: true,
        sort_order: 0,
        options: [],
      });
    }

    setOpen(true);
  }

  function onFinish(values) {
    const englishName = values.name_en?.trim() || "";

    const payload = {
      code: values.code?.trim(),
      type: values.type,
      scope: values.scope || "product",
      unit: values.unit?.trim() || null,
      sort_order: values.sort_order ?? 0,
      is_filterable: values.is_filterable ?? false,
      is_required: values.is_required ?? false,
      is_active: values.is_active ?? true,

      translations: {
        en: {
          name: englishName,
        },
        tm: {
          name: values.name_tm?.trim() || englishName,
        },
        ru: {
          name: values.name_ru?.trim() || englishName,
        },
      },

      options: (values.options || []).map((option, index) => ({
        value: option.value?.trim(),
        color_hex: option.color_hex?.trim() || null,
        sort_order: index,

        translations: {
          en: {
            label: option.label_en?.trim() || option.value,
          },
          tm: {
            label:
              option.label_tm?.trim() ||
              option.label_en?.trim() ||
              option.value,
          },
          ru: {
            label:
              option.label_ru?.trim() ||
              option.label_en?.trim() ||
              option.value,
          },
        },
      })),
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
      title: t("attributes.code"),
      dataIndex: "code",
      key: "code",
      render: (value) => <code>{value}</code>,
    },
    {
      title: t("attributes.name"),
      key: "name",
      render: (_, record) => (
        <span className="font-medium">{getAttributeName(record)}</span>
      ),
    },
    {
      title: t("attributes.type"),
      dataIndex: "type",
      key: "type",
      render: (value) => (
        <Tag color="blue">
          {t(`attributes.types.${value}`, { defaultValue: value })}
        </Tag>
      ),
    },
    {
      title: t("attributes.scope"),
      dataIndex: "scope",
      key: "scope",
      render: (value) =>
        t(`attributes.scopes.${value}`, { defaultValue: value }),
    },
    {
      title: t("attributes.filterable"),
      dataIndex: "is_filterable",
      key: "is_filterable",
      render: (value) =>
        value ? (
          <Tag color="success">{t("attributes.yes")}</Tag>
        ) : (
          <Tag>{t("attributes.no")}</Tag>
        ),
    },
    {
      title: t("attributes.options"),
      key: "options",
      render: (_, record) => record.options?.length || 0,
    },
    {
      title: t("attributes.status"),
      dataIndex: "is_active",
      key: "is_active",
      render: (value) =>
        value ? (
          <Tag color="success">{t("attributes.active")}</Tag>
        ) : (
          <Tag color="error">{t("attributes.inactive")}</Tag>
        ),
    },
    {
      title: t("attributes.actions"),
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
            title={t("attributes.deleteConfirm")}
            description={t("attributes.deleteDescription")}
            okText={t("attributes.delete")}
            cancelText={t("attributes.cancel")}
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
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Title level={3} className="!mb-0">
          {t("attributes.title")}
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openForm()}
        >
          {t("attributes.addAttribute")}
        </Button>
      </div>

      {isLoading ? (
        <Spin className="flex justify-center py-20" size="large" />
      ) : isError ? (
        <div className="py-12 text-center text-red-500">
          {t("attributes.loadFailed")}
        </div>
      ) : (
        <Table
          rowKey="id"
          dataSource={attributes}
          pagination={false}
          scroll={{ x: 850 }}
          columns={columns}
          locale={{
            emptyText: t("attributes.noAttributes"),
          }}
        />
      )}

      <Modal
        title={
          editing
            ? t("attributes.editAttribute")
            : t("attributes.createAttribute")
        }
        open={open}
        onCancel={closeForm}
        onOk={() => form.submit()}
        okText={editing ? t("attributes.update") : t("attributes.create")}
        cancelText={t("attributes.cancel")}
        confirmLoading={saving}
        width={760}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="mt-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item
              name="code"
              label={t("attributes.code")}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("attributes.codeRequired"),
                },
                {
                  pattern: /^[a-zA-Z0-9_-]+$/,
                  message: t("attributes.codeInvalid"),
                },
              ]}
            >
              <Input placeholder="brand" disabled={!!editing} maxLength={100} />
            </Form.Item>

            <Form.Item
              name="type"
              label={t("attributes.type")}
              rules={[
                { required: true, message: t("attributes.typeRequired") },
              ]}
            >
              <Select
                options={[
                  { value: "text", label: t("attributes.types.text") },
                  { value: "number", label: t("attributes.types.number") },
                  { value: "boolean", label: t("attributes.types.boolean") },
                  { value: "select", label: t("attributes.types.select") },
                  { value: "color", label: t("attributes.types.color") },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="name_en"
            label={t("attributes.nameEn")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("attributes.nameRequired"),
              },
            ]}
          >
            <Input maxLength={255} />
          </Form.Item>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item name="name_tm" label={t("attributes.nameTm")}>
              <Input maxLength={255} />
            </Form.Item>

            <Form.Item name="name_ru" label={t("attributes.nameRu")}>
              <Input maxLength={255} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Form.Item
              name="scope"
              label={t("attributes.scope")}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  {
                    value: "product",
                    label: t("attributes.scopes.product"),
                  },
                  {
                    value: "variant",
                    label: t("attributes.scopes.variant"),
                  },
                  {
                    value: "both",
                    label: t("attributes.scopes.both"),
                  },
                ]}
              />
            </Form.Item>

            <Form.Item name="unit" label={t("attributes.unit")}>
              <Input placeholder="GB, g, cm" />
            </Form.Item>

            <Form.Item name="sort_order" label={t("attributes.sortOrder")}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Form.Item
              name="is_filterable"
              label={t("attributes.filterable")}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="is_required"
              label={t("attributes.required")}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="is_active"
              label={t("attributes.active")}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          {["select", "color"].includes(type) && (
            <Form.List name="options">
              {(fields, { add, remove }) => (
                <div className="mb-4 rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <strong>{t("attributes.options")}</strong>

                    <Button
                      size="small"
                      onClick={() =>
                        add({
                          value: "",
                          label_en: "",
                          label_tm: "",
                          label_ru: "",
                          color_hex: "",
                        })
                      }
                    >
                      + {t("attributes.addOption")}
                    </Button>
                  </div>

                  {fields.map((field) => (
                    <div key={field.key} className="mb-4 rounded border p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Form.Item
                          {...field}
                          name={[field.name, "value"]}
                          label={t("attributes.optionValue")}
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: t("attributes.optionValueRequired"),
                            },
                          ]}
                        >
                          <Input placeholder="value" />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, "label_en"]}
                          label={t("attributes.optionLabelEn")}
                        >
                          <Input />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, "label_tm"]}
                          label={t("attributes.optionLabelTm")}
                        >
                          <Input />
                        </Form.Item>

                        <Form.Item
                          {...field}
                          name={[field.name, "label_ru"]}
                          label={t("attributes.optionLabelRu")}
                        >
                          <Input />
                        </Form.Item>

                        {type === "color" && (
                          <Form.Item
                            {...field}
                            name={[field.name, "color_hex"]}
                            label={t("attributes.colorHex")}
                          >
                            <Input placeholder="#ffffff" />
                          </Form.Item>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => remove(field.name)}
                        >
                          {t("attributes.removeOption")}
                        </Button>
                      </div>
                    </div>
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
