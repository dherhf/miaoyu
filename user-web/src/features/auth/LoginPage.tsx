import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Form, Input, NavBar, Toast } from 'antd-mobile'
import { useAuthStore } from './store'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { phone: string; password: string }) => {
    setLoading(true)
    try {
      await login(values.phone, values.password)
      Toast.show({ content: '登录成功', icon: 'success' })
      navigate('/')
    } catch {
      // 拦截器已统一提示
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar>登录</NavBar>
      <div style={{ flex: 1, padding: '16px' }}>
        <Form
          layout="horizontal"
          onFinish={handleSubmit}
          footer={
            <Button block type="submit" color="primary" size="large" loading={loading}>
              登录
            </Button>
          }
        >
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '手机号不能为空' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误' },
            ]}
          >
            <Input placeholder="请输入手机号" clearable />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '密码不能为空' }]}
          >
            <Input placeholder="请输入密码" type="password" clearable />
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          还没有账号？<Link to="/register">去注册</Link>
        </div>
      </div>
    </div>
  )
}
