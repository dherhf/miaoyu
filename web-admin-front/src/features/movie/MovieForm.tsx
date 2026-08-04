import { Form, Input, InputNumber, DatePicker, Radio, Checkbox, Upload, Space, message } from 'antd';
import type { FormInstance, UploadProps } from 'antd';
import { Film } from 'lucide-react';
import dayjs from 'dayjs';
import { MOVIE_TYPES } from './store';
import styles from './MoviePage.module.css';

interface MovieFormProps {
  form: FormInstance;
}

export function MovieForm({ form }: MovieFormProps) {
  const uploadConfig: UploadProps = {
    maxCount: 1,
    listType: 'picture-card',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImg = file.type.startsWith('image/');
      if (!isImg) {
        message.error('仅支持图片文件');
        return false;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        form.setFieldValue('posterUrl', e.target?.result as string);
      };
      reader.readAsDataURL(file);
      return false;
    },
  };

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
            disabledDate={(d) => d.isAfter(dayjs())}
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
          {form.getFieldValue('posterUrl') ? (
            <img src={form.getFieldValue('posterUrl')} alt="海报" className={styles.uploadImage} />
          ) : (
            <div className={styles.uploadPlaceholder}>
              <Film size={20} />
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
