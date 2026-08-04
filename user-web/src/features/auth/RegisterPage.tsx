import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { App, Button, Form, Input } from 'antd'
import { useAuthStore } from './store'
import { useHeaderBack } from '@/layouts/navBarStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const register = useAuthStore((s) => s.register)
  const [loading, setLoading] = useState(false)

  useHeaderBack(true)

  const handleSubmit = async (values: { phone: string; password: string }) => {
    setLoading(true)
    try {
      await register(values.phone, values.password)
      message.success('注册成功')
      navigate('/login')
    } catch {
      // 拦截器已统一提示
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <div className="max-w-[400px] mx-auto w-full">
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '手机号不能为空' },
              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误' },
            ]}
          >
            <Input placeholder="请输入手机号" allowClear size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '密码不能为空' },
              { min: 6, max: 20, message: '密码长度需为6-20位' },
            ]}
          >
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item className="mb-0!">
            <Button block type="primary" htmlType="submit" size="large" loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>
        <div className="text-center mt-4">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  )
}
