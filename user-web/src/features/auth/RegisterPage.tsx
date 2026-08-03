import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Form, Input, NavBar, Toast } from 'antd-mobile'
import { useAuthStore } from './store'

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { phone: string; password: string }) => {
    setLoading(true)
    try {
      await register(values.phone, values.password)
      Toast.show({ content: '注册成功', icon: 'success' })
      navigate('/login')
    } catch {
      // 拦截器已统一提示
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>注册</NavBar>
      <div style={{ flex: 1, padding: '16px' }}>
        <Form
          layout="horizontal"
          onFinish={handleSubmit}
          footer={
            <Button block type="submit" color="primary" size="large" loading={loading}>
              注册
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
            rules={[
              { required: true, message: '密码不能为空' },
              { min: 6, max: 20, message: '密码长度需为6-20位' },
            ]}
          >
            <Input placeholder="请输入密码" type="password" clearable />
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  )
}
