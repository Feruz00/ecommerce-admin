import { Form, Input, Button, Card, Typography } from "antd";
import { useLogin } from "./hooks";
import { LockOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function LoginPage() {
  const loginMutation = useLogin();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 px-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <div className="text-center mb-6">
          <Title level={2} className="!mb-1">
            Hoş geldiňiz!
          </Title>
          <Text type="secondary">Ulgama gir</Text>
        </div>

        <Form
          layout="vertical"
          size="large"
          onFinish={(values) => loginMutation.mutate(values)}
        >
          <Form.Item
            name="username"
            label="Ulanyjynyň ady"
            rules={[{ required: true }]}
          >
            <Input prefix={<UserOutlined />} placeholder="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Açar sözi"
            rules={[{ required: true }]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
            >
              Ulgama gir
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
