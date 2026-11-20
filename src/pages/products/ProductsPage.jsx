import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
  AppstoreOutlined,
  InboxOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";

const { Title, Text } = Typography;

const money = (value) =>
  `${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} TMT`;

const getAttrLabel = (attribute) =>
  attribute.name ||
  attribute.translations?.en?.name ||
  attribute.translations?.tm?.name ||
  attribute.code;

const getOptionLabel = (option) =>
  option.label ||
  option.translations?.en?.label ||
  option.translations?.tm?.label ||
  option.value;

const getAttributeFormValue = (attributeValue) => {
  if (attributeValue.option_id != null) return attributeValue.option_id;
  if (attributeValue.value_boolean != null) return attributeValue.value_boolean;
  if (attributeValue.value_number != null)
    return Number(attributeValue.value_number);
  return attributeValue.value_text ?? undefined;
};

async function uploadImage(file, entityType = "product") {
  const body = new FormData();
  body.append("image", file);
  body.append("entity_type", entityType);
  body.append("is_primary", "true");

  const { data } = await api.post("/files/upload", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const uploaded = data?.data?.file;
  if (!uploaded?.id)
    throw new Error("Upload response did not contain a file ID");
  return uploaded;
}

function AttributeField({ attribute, name, ...formItemProps }) {
  const options = (attribute.options || []).map((option) => ({
    value: option.id,
    label: getOptionLabel(option),
  }));

  let control;
  if (["select", "color"].includes(attribute.type)) {
    control = (
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={`Select ${getAttrLabel(attribute).toLowerCase()}`}
        options={options}
      />
    );
  } else if (attribute.type === "number") {
    control = <InputNumber className="w-full" min={0} />;
  } else if (attribute.type === "boolean") {
    control = <Switch />;
    formItemProps.valuePropName = "checked";
  } else {
    control = (
      <Input placeholder={`Enter ${getAttrLabel(attribute).toLowerCase()}`} />
    );
  }

  return (
    <Form.Item name={name} label={getAttrLabel(attribute)} {...formItemProps}>
      {control}
    </Form.Item>
  );
}

export default function ProductsPage() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [productImage, setProductImage] = useState(null);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productUploading, setProductUploading] = useState(false);
  const [variantUploading, setVariantUploading] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () =>
      api
        .get("/products", {
          params: { page: 1, limit: 100, include_inactive: "true" },
        })
        .then((response) => response.data),
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => api.get("/categories").then((response) => response.data),
  });

  const attributesQuery = useQuery({
    queryKey: ["admin-attributes"],
    queryFn: () =>
      api
        .get("/attributes", { params: { include_inactive: "true" } })
        .then((response) => response.data),
  });

  const products = productsQuery.data?.data?.products || [];
  const categories = categoriesQuery.data?.data?.categories || [];
  const allAttributes = attributesQuery.data?.data?.attributes || [];

  const productAttributes = useMemo(
    () =>
      allAttributes.filter((item) => ["product", "both"].includes(item.scope)),
    [allAttributes],
  );
  const variantAttributes = useMemo(
    () =>
      allAttributes.filter((item) => ["variant", "both"].includes(item.scope)),
    [allAttributes],
  );

  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post("/products", payload),
    onSuccess: () => {
      refreshProducts();
      message.success("Product created");
      closeModal();
    },
    onError: (error) =>
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Could not create product",
      ),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }) => api.patch(`/products/${id}`, payload),
    onSuccess: () => {
      refreshProducts();
      message.success("Product updated");
      closeModal();
    },
    onError: (error) =>
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Could not update product",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      refreshProducts();
      message.success("Product deleted");
    },
    onError: (error) =>
      message.error(
        error.response?.data?.message || "Could not delete product",
      ),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => api.post("/products/bulk-delete", { ids }),
    onSuccess: () => {
      refreshProducts();
      setSelectedRowKeys([]);
      message.success("Selected products deleted");
    },
    onError: (error) =>
      message.error(
        error.response?.data?.message || "Could not delete products",
      ),
  });

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setProductImage(null);
    setProductImageUrl("");
    setVariantUploading({});
    form.resetFields();
  }

  async function openForm(record = null) {
    setEditingProduct(record);
    setProductImage(null);
    setProductImageUrl("");
    form.resetFields();

    if (!record) {
      form.setFieldsValue({
        is_active: true,
        is_featured: false,
        quantity: 0,
        variants: [],
      });
      setModalOpen(true);
      return;
    }

    setDetailLoading(true);
    try {
      const response = await api.get(`/products/${record.id}`, {
        params: { include_inactive: "true" },
      });
      const product = response.data?.data?.product;
      if (!product) throw new Error("Product details were not returned");

      setProductImageUrl(product.image || "");

      const values = {
        sku: product.sku,
        slug: product.slug,
        price: product.price != null ? Number(product.price) : undefined,
        compare_at_price:
          product.compare_at_price != null
            ? Number(product.compare_at_price)
            : undefined,
        quantity: product.quantity ?? 0,
        category_id: product.category_id,
        is_active: product.is_active !== false,
        is_featured: product.is_featured === true,
        name_en: product.translations?.en?.name || "",
        name_tm: product.translations?.tm?.name || "",
        name_ru: product.translations?.ru?.name || "",
        image_url: product.image || "",
        variants: (product.variants || []).map((variant) => {
          const attributes = {};
          (variant.attributes || []).forEach((item) => {
            attributes[item.attribute_id] =
              item.option_id != null
                ? item.option_id
                : item.value_boolean != null
                  ? item.value_boolean
                  : item.value_number != null
                    ? Number(item.value_number)
                    : (item.value_text ?? undefined);
          });

          return {
            id: variant.id,
            sku: variant.sku,
            price: variant.price != null ? Number(variant.price) : undefined,
            compare_at_price:
              variant.compare_at_price != null
                ? Number(variant.compare_at_price)
                : undefined,
            quantity: variant.quantity ?? 0,
            is_active: variant.is_active !== false,
            image_file_id: variant.image_file_id || null,
            image_url: variant.image || variant.imageFile?.url || "",
            attributes,
          };
        }),
      };

      productAttributes.forEach((attribute) => {
        const value = (product.attributes || []).find(
          (item) => String(item.attribute_id) === String(attribute.id),
        );
        if (value)
          values[`attr_${attribute.id}`] = getAttributeFormValue(value);
      });

      form.setFieldsValue(values);
      setModalOpen(true);
    } catch (error) {
      message.error(
        error.response?.data?.message || "Could not load product details",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleProductUpload(file) {
    setProductUploading(true);
    try {
      const uploaded = await uploadImage(file, "product");
      setProductImage(uploaded);
      setProductImageUrl(uploaded.url);
      form.setFieldValue("image_url", uploaded.url);
      message.success("Product image uploaded");
    } catch (error) {
      message.error(
        error.response?.data?.message || error.message || "Image upload failed",
      );
    } finally {
      setProductUploading(false);
    }
    return false;
  }

  async function handleVariantUpload(file, fieldName) {
    setVariantUploading((state) => ({ ...state, [fieldName]: true }));
    try {
      const uploaded = await uploadImage(file, "variant");
      const variants = form.getFieldValue("variants") || [];
      const next = [...variants];
      next[fieldName] = {
        ...next[fieldName],
        image_file_id: uploaded.id,
        image_url: uploaded.url,
      };
      form.setFieldValue("variants", next);
      message.success("Variant image uploaded");
    } catch (error) {
      message.error(
        error.response?.data?.message || error.message || "Image upload failed",
      );
    } finally {
      setVariantUploading((state) => ({ ...state, [fieldName]: false }));
    }
    return false;
  }

  function buildProductAttributes(values) {
    return productAttributes
      .map((attribute) => {
        const value = values[`attr_${attribute.id}`];
        if (value === undefined || value === null || value === "") return null;

        const base = { attribute_id: attribute.id };
        if (["select", "color"].includes(attribute.type))
          return { ...base, option_id: value };
        if (attribute.type === "number")
          return { ...base, value_number: value };
        if (attribute.type === "boolean")
          return { ...base, value_boolean: Boolean(value) };
        return { ...base, value_text: String(value) };
      })
      .filter(Boolean);
  }

  function buildVariantAttributes(values = {}) {
    return variantAttributes
      .map((attribute) => {
        const value = values[attribute.id];
        if (value === undefined || value === null || value === "") return null;

        const base = { attribute_id: attribute.id };
        if (["select", "color"].includes(attribute.type)) {
          return { ...base, option_id: value };
        }
        // VariantAttributeValue stores free-form values in value_text.
        // Keep number/boolean values normalized as strings.
        if (attribute.type === "boolean") {
          return { ...base, value_text: value === true ? "true" : "false" };
        }
        return { ...base, value_text: String(value) };
      })
      .filter(Boolean);
  }

  function onFinish(values) {
    const payload = {
      sku: values.sku?.trim(),
      slug: values.slug?.trim(),
      price: values.price,
      compare_at_price: values.compare_at_price ?? null,
      quantity: values.quantity ?? 0,
      category_id: values.category_id,
      is_active: values.is_active !== false,
      is_featured: values.is_featured === true,
      image_file_id: productImage?.id || undefined,
      image_url: productImage
        ? undefined
        : values.image_url?.trim() || undefined,
      translations: {
        en: {
          name: values.name_en?.trim(),
          shortDescription: values.name_en?.trim(),
          description: values.name_en?.trim(),
        },
        tm: {
          name: values.name_tm?.trim() || values.name_en?.trim(),
          shortDescription: values.name_tm?.trim() || values.name_en?.trim(),
          description: values.name_tm?.trim() || values.name_en?.trim(),
        },
        ru: {
          name: values.name_ru?.trim() || values.name_en?.trim(),
          shortDescription: values.name_ru?.trim() || values.name_en?.trim(),
          description: values.name_ru?.trim() || values.name_en?.trim(),
        },
      },
      attributes: buildProductAttributes(values),
      variants: (values.variants || []).map((variant, index) => ({
        id: variant.id || undefined,
        sku: variant.sku?.trim(),
        price: variant.price ?? null,
        compare_at_price: variant.compare_at_price ?? null,
        quantity: variant.quantity ?? 0,
        is_active: variant.is_active !== false,
        image_file_id: variant.image_file_id || null,
        sort_order: index,
        attributes: buildVariantAttributes(variant.attributes),
      })),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const columns = [
    {
      title: "Product",
      key: "product",
      render: (_, product) => (
        <div className="flex min-w-[220px] items-center gap-3">
          {product.image ? (
            <Image
              src={product.image}
              width={48}
              height={48}
              preview={false}
              className="rounded-xl border border-slate-100 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <PictureOutlined />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-800">
              {product.name || product.slug}
            </div>
            <div className="text-xs text-slate-400">{product.sku}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: ["category", "name"],
      render: (value) => <Text type="secondary">{value || "—"}</Text>,
    },
    {
      title: "Price",
      dataIndex: "price",
      render: money,
    },
    {
      title: "Stock",
      dataIndex: "quantity",
      render: (value) => <span className="tabular-nums">{value ?? 0}</span>,
    },
    {
      title: "Variants",
      dataIndex: "variants_count",
      render: (_, product) =>
        product.variants_count != null ? (
          <Tag>{product.variants_count}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      render: (active) => (
        <Tag color={active ? "success" : "default"}>
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, product) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label="Edit product"
            onClick={() => openForm(product)}
          />
          <Popconfirm
            title="Delete this product?"
            description="This action cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(product.id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="Delete product"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1 !text-slate-800">
            Products
          </Title>
          <Text type="secondary">
            Manage your catalog, product details and variants.
          </Text>
        </div>
        <Space wrap>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`Delete ${selectedRowKeys.length} selected products?`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => bulkDeleteMutation.mutate(selectedRowKeys)}
            >
              <Button danger loading={bulkDeleteMutation.isPending}>
                Delete selected ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openForm()}
          >
            Add product
          </Button>
        </Space>
      </div>

      <Card bordered={false} className="!rounded-2xl !shadow-sm">
        <Table
          rowKey="id"
          loading={productsQuery.isLoading}
          columns={columns}
          dataSource={products}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `${total} products`,
          }}
          scroll={{ x: 850 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        onCancel={closeModal}
        title={
          <div>
            <div className="text-base font-semibold text-slate-800">
              {editingProduct ? "Edit product" : "Create product"}
            </div>
            <div className="text-xs font-normal text-slate-400">
              Product information, attributes and variants
            </div>
          </div>
        }
        width={900}
        centered
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={closeModal}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={saving}
            onClick={() => form.submit()}
          >
            {editingProduct ? "Save changes" : "Create product"}
          </Button>,
        ]}
      >
        {detailLoading ? (
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              is_active: true,
              is_featured: false,
              quantity: 0,
              variants: [],
            }}
            className="mt-5"
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_250px]">
              <div className="min-w-0 space-y-1">
                <Card
                  size="small"
                  bordered={false}
                  className="!mb-4 !rounded-xl !bg-slate-50"
                  title={
                    <span className="text-sm font-semibold">
                      Basic information
                    </span>
                  }
                >
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="sku"
                        label="Product SKU"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: "SKU is required",
                          },
                        ]}
                      >
                        <Input placeholder="e.g. PHONE-001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="slug"
                        label="Slug"
                        rules={[
                          {
                            required: true,
                            whitespace: true,
                            message: "Slug is required",
                          },
                        ]}
                      >
                        <Input placeholder="product-name" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="name_en"
                    label="Name (English)"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: "English name is required",
                      },
                    ]}
                  >
                    <Input placeholder="Product name" />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item name="name_tm" label="Name (Turkmen)">
                        <Input placeholder="Harydyň ady" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="name_ru" label="Name (Russian)">
                        <Input placeholder="Название товара" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="category_id"
                    label="Category"
                    rules={[{ required: true, message: "Choose a category" }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Choose category"
                      options={categories.map((category) => ({
                        value: category.id,
                        label: category.name || category.slug,
                      }))}
                    />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="price"
                        label="Base price (TMT)"
                        rules={[{ required: true, message: "Enter a price" }]}
                      >
                        <InputNumber min={0} className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="compare_at_price" label="Compare price">
                        <InputNumber min={0} className="w-full" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="quantity" label="Base stock">
                        <InputNumber min={0} className="w-full" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                {productAttributes.length > 0 && (
                  <Card
                    size="small"
                    bordered={false}
                    className="!mb-4 !rounded-xl !bg-slate-50"
                    title={
                      <span className="text-sm font-semibold">
                        Product attributes
                      </span>
                    }
                  >
                    <Row gutter={12}>
                      {productAttributes.map((attribute) => (
                        <Col xs={24} md={12} key={attribute.id}>
                          <AttributeField
                            attribute={attribute}
                            name={`attr_${attribute.id}`}
                          />
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card
                  size="small"
                  bordered={false}
                  className="!rounded-xl !bg-slate-50"
                  title={
                    <span className="text-sm font-semibold">Product image</span>
                  }
                >
                  <div className="flex flex-col items-center gap-3">
                    {productImageUrl ? (
                      <Image
                        src={productImageUrl}
                        width="100%"
                        height={170}
                        className="rounded-xl object-cover"
                        preview
                      />
                    ) : (
                      <div className="flex h-[170px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-300">
                        <PictureOutlined className="text-3xl" />
                        <Text type="secondary" className="mt-2 text-xs">
                          No image selected
                        </Text>
                      </div>
                    )}
                    <Upload
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      showUploadList={false}
                      beforeUpload={handleProductUpload}
                    >
                      <Button
                        block
                        icon={<UploadOutlined />}
                        loading={productUploading}
                      >
                        Upload image
                      </Button>
                    </Upload>
                    <Form.Item name="image_url" noStyle>
                      <Input
                        size="small"
                        placeholder="Or paste image URL"
                        onChange={(event) => {
                          const value = event.target.value;
                          form.setFieldValue("image_url", value);
                          setProductImage(null);
                          setProductImageUrl(value);
                        }}
                      />
                    </Form.Item>
                    <Text type="secondary" className="text-center text-xs">
                      JPEG, PNG, WebP or GIF
                    </Text>
                  </div>
                </Card>

                <Card
                  size="small"
                  bordered={false}
                  className="!rounded-xl !bg-slate-50"
                  title={
                    <span className="text-sm font-semibold">Visibility</span>
                  }
                >
                  <Form.Item
                    name="is_active"
                    label="Product active"
                    valuePropName="checked"
                    className="!mb-3"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="is_featured"
                    label="Featured product"
                    valuePropName="checked"
                    className="!mb-0"
                  >
                    <Switch />
                  </Form.Item>
                </Card>
              </div>
            </div>

            <Divider className="!my-5" />

            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AppstoreOutlined className="text-slate-500" />
                <div>
                  <div className="font-semibold text-slate-800">Variants</div>
                  <Text type="secondary" className="text-xs">
                    Add sizes, colors, storage capacities and other options.
                  </Text>
                </div>
              </div>
            </div>

            <Form.List name="variants">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const variantValues =
                      form.getFieldValue(["variants", field.name]) || {};
                    return (
                      <Card
                        key={field.key}
                        size="small"
                        className="!rounded-xl !border-slate-200"
                        title={
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-600">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold">
                              Variant {index + 1}
                            </span>
                            {variantValues.id && (
                              <Tag bordered={false}>Saved</Tag>
                            )}
                          </div>
                        }
                        extra={
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          >
                            Remove
                          </Button>
                        }
                      >
                        <Form.Item name={[field.name, "id"]} hidden>
                          <Input />
                        </Form.Item>
                        <Row gutter={12}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name={[field.name, "sku"]}
                              label="Variant SKU"
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  message: "Variant SKU is required",
                                },
                              ]}
                            >
                              <Input placeholder="e.g. PHONE-001-BLACK-128" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={4}>
                            <Form.Item
                              name={[field.name, "price"]}
                              label="Price"
                            >
                              <InputNumber min={0} className="w-full" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={4}>
                            <Form.Item
                              name={[field.name, "compare_at_price"]}
                              label="Compare"
                            >
                              <InputNumber min={0} className="w-full" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={4}>
                            <Form.Item
                              name={[field.name, "quantity"]}
                              label="Stock"
                            >
                              <InputNumber min={0} className="w-full" />
                            </Form.Item>
                          </Col>
                        </Row>

                        {variantAttributes.length > 0 && (
                          <>
                            <Divider className="!my-2" />
                            <Text
                              strong
                              className="mb-3 block text-xs uppercase tracking-wide text-slate-500"
                            >
                              Variant attributes
                            </Text>
                            <Row gutter={12}>
                              {variantAttributes.map((attribute) => {
                                const isBoolean = attribute.type === "boolean";
                                return (
                                  <Col xs={24} md={8} key={attribute.id}>
                                    {isBoolean ? (
                                      <Form.Item
                                        name={[
                                          field.name,
                                          "attributes",
                                          attribute.id,
                                        ]}
                                        label={getAttrLabel(attribute)}
                                        valuePropName="checked"
                                      >
                                        <Switch />
                                      </Form.Item>
                                    ) : (
                                      <AttributeField
                                        attribute={attribute}
                                        name={[
                                          field.name,
                                          "attributes",
                                          attribute.id,
                                        ]}
                                      />
                                    )}
                                  </Col>
                                );
                              })}
                            </Row>
                          </>
                        )}

                        <Divider className="!my-2" />
                        <Row gutter={12} align="middle">
                          <Col xs={24} md={12}>
                            <Form.Item
                              name={[field.name, "image_file_id"]}
                              hidden
                            >
                              <Input />
                            </Form.Item>
                            <Form.Item name={[field.name, "image_url"]} noStyle>
                              <Input type="hidden" />
                            </Form.Item>
                            <div className="flex items-center gap-3">
                              {variantValues.image_url ? (
                                <Image
                                  src={variantValues.image_url}
                                  width={48}
                                  height={48}
                                  preview={false}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                  <PictureOutlined />
                                </div>
                              )}
                              <Upload
                                accept="image/jpeg,image/png,image/webp"
                                showUploadList={false}
                                beforeUpload={(file) =>
                                  handleVariantUpload(file, field.name)
                                }
                              >
                                <Button
                                  size="small"
                                  icon={<UploadOutlined />}
                                  loading={variantUploading[field.name]}
                                >
                                  Variant image
                                </Button>
                              </Upload>
                            </div>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name={[field.name, "is_active"]}
                              label="Variant active"
                              valuePropName="checked"
                              className="!mb-0"
                            >
                              <Switch />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}

                  <Button
                    block
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({
                        quantity: 0,
                        is_active: true,
                        attributes: {},
                        image_file_id: null,
                        image_url: "",
                      })
                    }
                  >
                    Add variant
                  </Button>

                  {fields.length === 0 && (
                    <Alert
                      type="info"
                      showIcon
                      icon={<InboxOutlined />}
                      message="No variants added"
                      description="This product will use its base price and stock. Add variants only when customers can choose different options."
                    />
                  )}
                </div>
              )}
            </Form.List>
          </Form>
        )}
      </Modal>
    </div>
  );
}
