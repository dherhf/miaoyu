import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App as AntApp } from 'antd';
import type { FormProps } from 'antd';
import { PhoneOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authApi } from './api';
import { useAuthStore } from './store';
import type { LoginParams } from './types';
import styles from './LoginPage.module.css';

/**
 * 登录页组件
 * 管理员通过手机号 + 密码登录管理后台。
 * 登录成功后：
 * 1. 将 token 存入 auth store（持久化到 localStorage）
 * 2. 将管理员信息存入 auth store
 * 3. 跳转到数据看板页
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<LoginParams>();
  // 登录中 loading 状态
  const [loading, setLoading] = useState(false);
  const { message } = AntApp.useApp();

  /**
   * 表单提交处理（登录）
   * 1. 调用登录 API
   * 2. 成功：存 token + 管理员信息，跳转看板
   * 3. 失败：由 axios 响应拦截器统一提示错误
   */
  const handleSubmit: FormProps<LoginParams>['onFinish'] = async (values) => {
    setLoading(true);
    try {
      // 调用登录接口获取 token 和管理员信息
      const { token, adminInfo } = await authApi.login(values);
      // 存储 token（会持久化到 localStorage）
      useAuthStore.getState().setToken(token);
      // 存储管理员信息（内存中，刷新后重新拉取）
      useAuthStore.getState().setProfile(adminInfo);
      message.success('登录成功，欢迎使用妙语购票管理后台');
      // 跳转到数据看板
      navigate('/dashboard');
    } catch {
      // 错误提示已由 request 响应拦截器处理
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

      {/* 登录卡片 */}
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
          {/* 手机号输入 */}
          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ required: true, message: '请输入手机号' }]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
          </Form.Item>

          {/* 密码输入 */}
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>

          {/* 登录按钮 */}
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
