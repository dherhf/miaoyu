import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import type { FormProps } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './store';
import type { LoginParams } from './types';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form] = Form.useForm<LoginParams>();
  const [loading, setLoading] = useState(false);

  const handleSubmit: FormProps<LoginParams>['onFinish'] = async (values) => {
    setLoading(true);
    try {
      await login(values.phone, values.password);
      await message.success('登录成功，欢迎使用妙语购票管理后台');
      navigate('/dashboard');
    } catch {
      // 错误提示已由 request 拦截器处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 渐变装饰背景 */}
      <div className={styles.bgDecoration}>
        <div className={styles.blobBlue} />
        <div className={styles.blobPurple} />
      </div>

      {/* 登录 */}
      <Card
        className={styles.card}
        variant="borderless"
        styles={{ body: { padding: '40px 32px' } }}
      >
        {/* 标题区域 */}
        <div className={styles.titleArea}>
          <Typography.Title level={2} className={styles.title}>
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
            name="phone"
            label="手机号"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>

          <Form.Item className={styles.submitItem}>
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
        <div className={styles.footer}>
          <Typography.Text type="secondary" className={styles.footerText}>
            © 2026 妙语购票 - 管理后台系统 版权所有
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
}
