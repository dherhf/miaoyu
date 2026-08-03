import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography } from 'antd';
import type { FormProps } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from './store';

// 表单类型定义
type LoginFormValues = {
  username: string;
  password: string;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);

  // 提交登录
  const handleSubmit: FormProps<LoginFormValues>['onFinish'] = async (values) => {
    setLoading(true);
    // 模拟接口延迟
    await new Promise((resolve) => setTimeout(resolve, 500));
    const result = login(values.username, values.password);

    if (result.success) {
      toast.success('登录成功', {
        description: '欢迎使用妙语购票管理后台',
      });
      navigate('/dashboard');
    } else {
      toast.error('登录失败', {
        description: result.message || '用户名或密码错误',
      });
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      {/* 渐变装饰背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '25%',
            width: 384,
            height: 384,
            background: 'rgba(24, 144, 255, 0.05)',
            borderRadius: '50%',
            filter: 'blur(48px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '25%',
            right: '25%',
            width: 384,
            height: 384,
            background: 'rgba(114, 46, 209, 0.05)',
            borderRadius: '50%',
            filter: 'blur(48px)',
          }}
        />
      </div>

      {/* 登录卡片 */}
      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          zIndex: 1,
        }}
        variant="borderless"
        styles={{ body: { padding: '40px 32px' } }}
      >
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            妙语购票
          </Typography.Title>
          <Typography.Text type="secondary">管理后台</Typography.Text>
        </div>

        {/* antd 登录表单 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>

          <Form.Item style={{ marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {/* 底部版权 */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            © 2026 妙语购票 - 管理后台系统 版权所有
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
