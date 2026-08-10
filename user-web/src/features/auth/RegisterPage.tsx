import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { App, Button, Form, Input } from 'antd'
import { useAuthStore } from './store'
import * as authApi from './api'
import { useHeaderBack } from '@/layouts/navBarStore'

/**
 * 注册页组件。
 * 提供手机号 + 密码 + 图形验证码 + 短信验证码的注册表单。
 * 流程：输入手机号 → 输入图形验证码 → 发送短信验证码 → 填写并提交注册。
 * 注册成功后跳转登录页。
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  // 注册方法
  const register = useAuthStore((s) => s.register)
  // 提交中加载状态
  const [loading, setLoading] = useState(false)
  // 图形验证码ID（提交短信验证码时需携带）
  const [captchaId, setCaptchaId] = useState('')
  // 图形验证码图片（Base64）
  const [captchaImage, setCaptchaImage] = useState('')
  // 短信验证码发送中状态
  const [smsSending, setSmsSending] = useState(false)
  // 短信验证码倒计时（秒），>0 时按钮禁用
  const [countdown, setCountdown] = useState(0)
  // Ant Design 表单实例
  const [form] = Form.useForm()
  // 倒计时定时器引用
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 配置 Header 显示返回按钮
  useHeaderBack(true)

  /** 刷新图形验证码 */
  const refreshCaptcha = useCallback(async () => {
    try {
      const data = await authApi.getCaptcha()
      setCaptchaId(data.captchaId)
      setCaptchaImage(data.image)
    } catch {
      // 拦截器已统一提示
    }
  }, [])

  // 页面加载时获取图形验证码
  useEffect(() => {
    refreshCaptcha()
  }, [refreshCaptcha])

  // 组件卸载时清理倒计时定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  /** 启动短信验证码 60 秒倒计时 */
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

  /**
   * 发送短信验证码。
   * 需先输入手机号和图形验证码，发送后启动 60 秒倒计时。
   */
  const handleSendSms = async () => {
    const phone = form.getFieldValue('phone')
    const captchaCode = form.getFieldValue('captchaCode')
    // 校验手机号格式
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      message.error('请输入正确的手机号')
      return
    }
    // 校验图形验证码
    if (!captchaCode) {
      message.error('请先输入图形验证码')
      return
    }
    setSmsSending(true)
    try {
      // 发送短信验证码（场景：注册）
      await authApi.sendSmsCode({ phone, captchaId, captchaCode, scene: 'register' })
      message.success('短信验证码已发送')
      startCountdown()
    } catch {
      // 发送失败则刷新图形验证码
      refreshCaptcha()
    } finally {
      setSmsSending(false)
    }
  }

  /**
   * 处理注册表单提交。
   * @param values 表单值：手机号、密码、短信验证码
   */
  const handleSubmit = async (values: {
    phone: string
    password: string
    smsCode: string
  }) => {
    setLoading(true)
    try {
      await register(values.phone, values.password, values.smsCode)
      message.success('注册成功')
      navigate('/login')
    } catch {
      // 注册失败则刷新图形验证码
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6 lg:max-w-[960px] lg:mx-auto lg:w-full lg:px-6 lg:py-8 xl:max-w-[1200px] xl:p-8">
      <div className="max-w-[400px] mx-auto w-full">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* 手机号输入（校验格式：1开头11位） */}
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
          {/* 密码输入（6-20位） */}
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
          {/* 图形验证码输入 + 验证码图片（点击刷新） */}
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
          {/* 短信验证码输入 + 发送按钮（60秒倒计时） */}
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
          <Form.Item className="mb-0!">
            <Button block type="primary" htmlType="submit" size="large" loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>
        {/* 底部链接：已有账号去登录 */}
        <div className="text-center mt-4">
          已有账号？<Link to="/login">去登录</Link>
        </div>
      </div>
    </div>
  )
}
