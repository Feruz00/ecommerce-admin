import { useState } from "react";
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Spin,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import api from "../../api/axios";

const { Title } = Typography;

export default function UsersPage() {
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);

  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, search, roleFilter, statusFilter],
    queryFn: () =>
      api
        .get("/users", {
          params: {
            page,
            limit: 15,
            search: search || undefined,
            role: roleFilter,
            status: statusFilter,
          },
        })
        .then((res) => res.data),
  });

  const invalidateUsers = () => qc.invalidateQueries({ queryKey: ["users"] });

  const createMut = useMutation({
    mutationFn: (values) => api.post("/users", values),
    onSuccess: () => {
      invalidateUsers();
      message.success(t("users.created"));
      setOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || t("users.createFailed"));
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...values }) => api.patch(`/users/${id}`, values),
    onSuccess: () => {
      invalidateUsers();
      message.success(t("users.updated"));
      setOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (error) => {
      message.error(error.response?.data?.message || t("users.updateFailed"));
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      invalidateUsers();
      message.success(t("users.deactivated"));
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("users.deactivateFailed"),
      );
    },
  });

  const bulkMut = useMutation({
    mutationFn: (ids) => api.post("/users/bulk-delete", { ids }),
    onSuccess: () => {
      invalidateUsers();
      setSelected([]);
      message.success(t("users.bulkDeactivated"));
    },
    onError: (error) => {
      message.error(
        error.response?.data?.message || t("users.bulkDeactivateFailed"),
      );
    },
  });

  const users = data?.data?.users || [];
  const total = data?.total || 0;

  function openCreateForm() {
    setEditing(null);
    form.resetFields();

    form.setFieldsValue({
      role: "customer",
      status: "active",
      preferred_lang: "en",
    });

    setOpen(true);
  }

  function openEditForm(record) {
    setEditing(record);
    form.resetFields();

    form.setFieldsValue({
      first_name: record.first_name,
      last_name: record.last_name,
      username: record.username,
      phone: record.phone,
      role: record.role,
      status: record.status,
      preferred_lang: record.preferred_lang || "en",
    });

    setOpen(true);
  }

  function onFinish(values) {
    const payload = { ...values };

    // Do not send an empty password when editing.
    if (editing && !payload.password) {
      delete payload.password;
    }

    if (editing) {
      updateMut.mutate({
        id: editing.id,
        ...payload,
      });
    } else {
      createMut.mutate(payload);
    }
  }

  const roleOptions = [
    { value: "admin", label: t("users.roles.admin") },
    { value: "manager", label: t("users.roles.manager") },
    { value: "customer", label: t("users.roles.customer") },
  ];

  const statusOptions = [
    { value: "active", label: t("users.statuses.active") },
    { value: "inactive", label: t("users.statuses.inactive") },
    { value: "banned", label: t("users.statuses.banned") },
  ];

  const languageOptions = [
    { value: "en", label: t("users.languages.en") },
    { value: "tm", label: t("users.languages.tm") },
    { value: "ru", label: t("users.languages.ru") },
  ];

  const columns = [
    {
      title: t("users.name"),
      key: "name",
      render: (_, record) => (
        <div>
          <div className="font-medium">
            {record.first_name} {record.last_name}
          </div>
          <div className="text-xs text-gray-400">@{record.username}</div>
        </div>
      ),
    },
    {
      title: t("users.phone"),
      dataIndex: "phone",
      key: "phone",
      render: (value) => value || "—",
    },
    {
      title: t("users.role"),
      dataIndex: "role",
      key: "role",
      render: (value) => {
        const colors = {
          admin: "red",
          manager: "blue",
          customer: "default",
        };

        return (
          <Tag color={colors[value] || "default"}>
            {t(`users.roles.${value}`, { defaultValue: value })}
          </Tag>
        );
      },
    },
    {
      title: t("users.status"),
      dataIndex: "status",
      key: "status",
      render: (value) => {
        const colors = {
          active: "green",
          inactive: "orange",
          banned: "red",
        };

        return (
          <Tag color={colors[value] || "default"}>
            {t(`users.statuses.${value}`, { defaultValue: value })}
          </Tag>
        );
      },
    },
    {
      title: t("users.preferredLanguage"),
      dataIndex: "preferred_lang",
      key: "preferred_lang",
      render: (value) =>
        t(`users.languages.${value}`, { defaultValue: value || "—" }),
    },
    {
      title: t("users.actions"),
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditForm(record)}
          />

          <Popconfirm
            title={t("users.deactivateConfirm")}
            description={t("users.deactivateDescription")}
            okText={t("users.deactivate")}
            cancelText={t("users.cancel")}
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
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <Title level={3} className="!mb-0">
          {t("users.title")}
        </Title>

        <Space wrap>
          {selected.length > 0 && (
            <Popconfirm
              title={t("users.bulkDeactivateConfirm", {
                count: selected.length,
              })}
              onConfirm={() => bulkMut.mutate(selected)}
              okText={t("users.deactivate")}
              cancelText={t("users.cancel")}
              okButtonProps={{ danger: true }}
            >
              <Button danger loading={bulkMut.isPending}>
                {t("users.deactivateSelected")} ({selected.length})
              </Button>
            </Popconfirm>
          )}

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateForm}
          >
            {t("users.addUser")}
          </Button>
        </Space>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("users.searchPlaceholder")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full sm:max-w-xs"
        />

        <Select
          allowClear
          placeholder={t("users.filterRole")}
          options={roleOptions}
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
          className="w-full sm:w-44"
        />

        <Select
          allowClear
          placeholder={t("users.filterStatus")}
          options={statusOptions}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          className="w-full sm:w-44"
        />
      </div>

      {isLoading ? (
        <Spin size="large" className="flex justify-center py-20" />
      ) : isError ? (
        <div className="text-center py-12 text-red-500">
          {t("users.loadFailed")}
        </div>
      ) : (
        <Table
          rowSelection={{
            selectedRowKeys: selected,
            onChange: setSelected,
            preserveSelectedRowKeys: true,
          }}
          dataSource={users}
          rowKey="id"
          columns={columns}
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            total,
            pageSize: 15,
            showSizeChanger: false,
            onChange: (nextPage) => setPage(nextPage),
            showTotal: (count, range) =>
              t("users.pagination", {
                from: range[0],
                to: range[1],
                total: count,
              }),
          }}
          locale={{
            emptyText: t("users.noUsers"),
          }}
        />
      )}

      <Modal
        title={editing ? t("users.editUser") : t("users.createUser")}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editing ? t("users.update") : t("users.create")}
        cancelText={t("users.cancel")}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          className="mt-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="first_name"
              label={t("users.firstName")}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("users.firstNameRequired"),
                },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="last_name"
              label={t("users.lastName")}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("users.lastNameRequired"),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            name="username"
            label={t("users.username")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("users.usernameRequired"),
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="phone" label={t("users.phone")}>
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label={editing ? t("users.newPassword") : t("users.password")}
            rules={
              editing
                ? [
                    {
                      min: 6,
                      message: t("users.passwordMin"),
                    },
                  ]
                : [
                    {
                      required: true,
                      message: t("users.passwordRequired"),
                    },
                    {
                      min: 6,
                      message: t("users.passwordMin"),
                    },
                  ]
            }
          >
            <Input.Password
              placeholder={
                editing
                  ? t("users.passwordEditPlaceholder")
                  : t("users.passwordPlaceholder")
              }
            />
          </Form.Item>

          <Form.Item
            name="role"
            label={t("users.role")}
            rules={[
              {
                required: true,
                message: t("users.roleRequired"),
              },
            ]}
          >
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item
            name="status"
            label={t("users.status")}
            rules={[
              {
                required: true,
                message: t("users.statusRequired"),
              },
            ]}
          >
            <Select options={statusOptions} />
          </Form.Item>

          <Form.Item
            name="preferred_lang"
            label={t("users.preferredLanguage")}
            rules={[
              {
                required: true,
                message: t("users.languageRequired"),
              },
            ]}
          >
            <Select options={languageOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
