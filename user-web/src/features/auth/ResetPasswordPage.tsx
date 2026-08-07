import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { App, Button, Form, Input } from 'antd'
import * as authApi from './api'
import { useHeaderBack } from '@/layouts/navBarStore'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [form] = Form.useForm()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useHeaderBack(true)

  const refreshCaptcha = useCallback(async () => {
    try {
      const data = await authApi.getCaptcha()
      setCaptchaId(data.captchaId)
      setCaptchaImage(data.image)
    } catch {
      // 拦截器已统一提示
    }
  }, [])

  useEffect(() => {
    refreshCaptcha()
  }, [refreshCaptcha])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCountdown = () => {
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendSms = async () => {
    const phone = form.getFieldValue('phone')
    const captchaCode = form.getFieldValue('captchaCode')
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      message.error('请输入正确的手机号')
      return
    }
    if (!captchaCode) {
      message.error('请先输入图形验证码')
      return
    }
    setSmsSending(true)
    try {
      await authApi.sendSmsCode({ phone, captchaId, captchaCode, scene: 'reset-password' })
      message.success('短信验证码已发送')
      startCountdown()
    } catch {
      refreshCaptcha()
    } finally {
      setSmsSending(false)
    }
  }

  const handleSubmit = async (values: {
    phone: string
    newPassword: string
    smsCode: string
  }) => {
    setLoading(true)
    try {
      await authApi.resetPassword({
        phone: values.phone,
        newPassword: values.newPassword,
        smsCode: values.smsCode,
      })
      message.success('密码重置成功')
      navigate('/login')
    } catch {
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <div className="max-w-[400px] mx-auto w-full">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
            name="captchaCode"
            label="图形验证码"
            rules={[{ required: true, message: '图形验证码不能为空' }]}
          >
            <div className="flex gap-2">
              <Input
                placeholder="请输入图形验证码"
                allowClear
                size="large"
                maxLength={4}
                className="flex-1"
              />
              {captchaImage && (
                <img
                  src={captchaImage}
                  alt="验证码"
                  onClick={refreshCaptcha}
                  className="h-[40px] w-[120px] cursor-pointer rounded border border-gray-200 object-contain"
                />
              )}
            </div>
          </Form.Item>
          <Form.Item
            name="smsCode"
            label="短信验证码"
            rules={[{ required: true, message: '短信验证码不能为空' }]}
          >
            <div className="flex gap-2">
              <Input
                placeholder="请输入短信验证码"
                allowClear
                size="large"
                maxLength={6}
                className="flex-1"
              />
              <Button
                size="large"
                disabled={countdown > 0}
                loading={smsSending}
                onClick={handleSendSms}
                className="w-[120px]"
              >
                {countdown > 0 ? `${countdown}s` : '发送验证码'}
              </Button>
            </div>
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '新密码不能为空' },
              { min: 6, max: 20, message: '密码长度需为6-20位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" size="large" />
          </Form.Item>
          <Form.Item className="mb-0!">
            <Button block type="primary" htmlType="submit" size="large" loading={loading}>
              重置密码
            </Button>
          </Form.Item>
        </Form>
        <div className="text-center mt-4">
          想起密码了？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  )
}
