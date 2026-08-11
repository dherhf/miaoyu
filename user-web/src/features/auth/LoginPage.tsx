import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Form, Input } from 'antd'
import { message } from "@/shared/globalMessage";
import { useAuthStore } from './store'
import { useHeaderBack } from '@/layouts/navBarStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)

  useHeaderBack()

  const handleSubmit = async (values: { phone: string; password: string }) => {
    setLoading(true)
    try {
      await login(values.phone, values.password)
      message.success('登录成功')
      navigate('/', { replace: true })
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
            rules={[{ required: true, message: '密码不能为空' }]}
          >
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item className="mb-0!">
            <Button block type="primary" htmlType="submit" size="large" loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div className="flex justify-between mt-4">
          <Link to="/reset-password">忘记密码？</Link>
          <Link to="/register">去注册</Link>
        </div>
      </div>
    </div>
  )
}
