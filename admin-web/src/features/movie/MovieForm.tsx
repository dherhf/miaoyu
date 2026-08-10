import { Form, Input, InputNumber, DatePicker, Radio, Checkbox, Upload, Space, App } from 'antd';
import type { FormInstance, UploadProps } from 'antd';
import { Film } from 'lucide-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { MOVIE_TYPES } from './store';
import styles from './MoviePage.module.css';

/** 影片表单组件属性 */
interface MovieFormProps {
  /** antd Form 实例（由父组件控制） */
  form: FormInstance;
  /** 暂存的待上传文件，提交时由父组件上传到 OSS */
  onFileSelect?: (file: File | null) => void;
}

/**
 * 影片新增/编辑表单组件
 *
 * 表单字段：
 * 1. 影片名称（必填，≤50字符）
 * 2. 影片类型多选（科幻、动作、喜剧等，必填）
 * 3. 时长（1-300分钟，必填）
 * 4. 评分（0-10，必填）和上映日期（必填）
 * 5. 导演（必填）和主演
 * 6. 状态：上架/下架（必填）
 * 7. 海报上传（必填，支持图片预览，提交时上传到 OSS）
 * 8. 影片简介（≤500字）
 *
 * 海报上传策略：
 * - 选择文件后暂存在父组件（onFileSelect），不立即上传
 * - 编辑模式下展示后端返回的签名 URL
 * - 提交表单时才调用 uploadImage 上传到 OSS
 */
export function MovieForm({ form, onFileSelect }: MovieFormProps) {
  const { message } = App.useApp();
  // 已选文件名（用于显示）
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  /**
   * 海报上传配置
   * - 校验文件类型（仅图片）
   * - 校验文件大小（≤10MB）
   * - 暂存文件到父组件，不立即上传
   * - 清空 posterUrl（新文件待提交时上传）
   */
  const uploadConfig: UploadProps = {
    maxCount: 1,
    listType: 'picture-card',
    showUploadList: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      // 类型校验：仅支持图片
      const isImg = file.type.startsWith('image/');
      if (!isImg) {
        message.error('仅支持图片文件');
        return Upload.LIST_IGNORE;
      }
      // 大小校验：不超过 10MB
      if (file.size > 10 * 1024 * 1024) {
        message.error('图片大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      // 只做本地校验，暂存文件，不立即上传
      onFileSelect?.(file);
      setSelectedFileName(file.name);
      // 清空 posterUrl（新文件待提交时上传）
      form.setFieldValue('posterUrl', '');
      return false; // 阻止自动上传
    },
  };

  // 获取海报预览 URL（编辑时后端已返回签名 URL）
  const posterUrl: string = form.getFieldValue('posterUrl') || '';
  const previewUrl = typeof posterUrl === 'string' && posterUrl.startsWith('http') ? posterUrl : undefined;

  return (
    <Form form={form} layout="vertical" className={styles.form}>
      {/* 影片名称 */}
      <Form.Item
        name="name"
        label="影片名称"
        rules={[
          { required: true, message: '请输入影片名称' },
          { max: 50, message: '名称不能超过50字符' },
        ]}
      >
        <Input placeholder="请输入影片名称" />
      </Form.Item>

      {/* 影片类型多选 */}
      <Form.Item
        name="types"
        label="影片类型"
        rules={[{ required: true, message: '至少选择一种影片类型' }]}
      >
        <Checkbox.Group>
          <Space wrap size={8}>
            {MOVIE_TYPES.map((t) => (
              <Checkbox key={t.value} value={t.value}>
                {t.label}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </Form.Item>

      {/* 时长（分钟） */}
      <Form.Item
        name="duration"
        label="时长(分钟)"
        rules={[
          { required: true, message: '请输入时长' },
          { type: 'number', min: 1, max: 300, message: '时长1-300分钟' },
        ]}
      >
        <InputNumber className={styles.fullWidth} min={1} max={300} placeholder="请输入时长" />
      </Form.Item>

      {/* 评分 & 上映日期 双栏 */}
      <div className={styles.ratingDateRow}>
        <Form.Item
          name="rating"
          label="评分"
          className={styles.formCol}
          rules={[
            { required: true, message: '请输入评分' },
            { type: 'number', min: 0, max: 10, message: '评分区间0-10' },
          ]}
        >
          <InputNumber className={styles.fullWidth} min={0} max={10} step={0.1} placeholder="0-10" />
        </Form.Item>
        <Form.Item
          name="releaseDate"
          label="上映日期"
          className={styles.formCol}
          rules={[{ required: true, message: '请选择上映日期' }]}
        >
          <DatePicker
            className={styles.fullWidth}
            // 不允许选择一年前的日期
            disabledDate={(d) => d.isBefore(dayjs().subtract(1, 'year'))}
          />
        </Form.Item>
      </div>

      {/* 导演 & 主演 双栏 */}
      <div className={styles.directorActorsRow}>
        <Form.Item
          name="director"
          label="导演"
          className={styles.formCol}
          rules={[
            { required: true, message: '请输入导演姓名' },
            { max: 50, message: '导演名称不超过50字符' },
          ]}
        >
          <Input placeholder="请输入导演姓名" />
        </Form.Item>
        <Form.Item
          name="actors"
          label="主演"
          className={styles.formCol}
          rules={[{ max: 100, message: '主演信息不超过100字符' }]}
        >
          <Input placeholder="多个主演用逗号分隔" />
        </Form.Item>
      </div>

      {/* 上下架状态 */}
      <Form.Item name="status" label="状态" rules={[{ required: true }]}>
        <Radio.Group>
          <Radio value="showing">上架</Radio>
          <Radio value="offline">下架</Radio>
        </Radio.Group>
      </Form.Item>

      {/* 海报上传 */}
      <Form.Item
        name="posterUrl"
        label="影片海报"
        rules={[{ required: true, message: '请上传海报图片' }]}
      >
        <Upload {...uploadConfig}>
          {previewUrl ? (
            // 编辑模式：展示后端返回的海报 URL
            <img src={previewUrl} alt="海报" className={styles.uploadImage} />
          ) : selectedFileName ? (
            // 已选文件但未上传：显示文件名
            <div className={styles.uploadPlaceholder}>
              <Film size={20} />
              <div className={styles.uploadPlaceholderText}>已选择: {selectedFileName}</div>
            </div>
          ) : (
            // 未选择文件：显示上传提示
            <div className={styles.uploadPlaceholder}>
              <Film size={20} />
              <div className={styles.uploadPlaceholderText}>上传海报</div>
            </div>
          )}
        </Upload>
      </Form.Item>

      {/* 影片简介 */}
      <Form.Item
        name="description"
        label="影片简介"
        rules={[{ max: 500, message: '简介最多500字' }]}
      >
        <Input.TextArea rows={3} maxLength={500} placeholder="请输入影片简介" showCount />
      </Form.Item>
    </Form>
  );
}
