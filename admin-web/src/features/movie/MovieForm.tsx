import { Form, Input, InputNumber, DatePicker, Radio, Checkbox, Upload, Space } from 'antd';
import type { FormInstance, UploadProps } from 'antd';
import { message } from "@/shared/utils/globalMessage";
import { VideoCameraOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { MOVIE_TYPES } from './store';
import styles from './MoviePage.module.css';

interface MovieFormProps {
  form: FormInstance;
  /** 暂存的待上传文件，提交时由父组件上传到 OSS */
  onFileSelect?: (file: File | null) => void;
}

export function MovieForm({ form, onFileSelect }: MovieFormProps) {
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const uploadConfig: UploadProps = {
    maxCount: 1,
    listType: 'picture-card',
    showUploadList: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isImg = file.type.startsWith('image/');
      if (!isImg) {
        message.error('仅支持图片文件');
        return Upload.LIST_IGNORE;
      }
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

      {/* 时长 */}
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
            disabledDate={(d) => d.isBefore(dayjs().subtract(1, 'year'))}
          />
        </Form.Item>
      </div>

      {/* 导演 & 主演 */}
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
            <img src={previewUrl} alt="海报" className={styles.uploadImage} />
          ) : selectedFileName ? (
            <div className={styles.uploadPlaceholder}>
              <VideoCameraOutlined style={{ fontSize: 20 }} />
              <div className={styles.uploadPlaceholderText}>已选择: {selectedFileName}</div>
            </div>
          ) : (
            <div className={styles.uploadPlaceholder}>
              <VideoCameraOutlined style={{ fontSize: 20 }} />
              <div className={styles.uploadPlaceholderText}>上传海报</div>
            </div>
          )}
        </Upload>
      </Form.Item>

      {/* 简介 */}
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
