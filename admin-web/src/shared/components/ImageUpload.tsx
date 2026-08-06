import React, { useState } from 'react';
import { Upload, Button, App } from 'antd';
import { UploadCloud, Loader, Trash2 } from 'lucide-react';
import styles from './ImageUpload.module.css';

export interface ImageUploadProps {
  /** 图片 URL 或 base64 */
  value?: string;
  /** 值变更回调 */
  onChange?: (url: string) => void;
  /** 最大文件大小（MB），默认 2 */
  maxSizeMB?: number;
  /** 接受的文件类型，默认 image/png,image/jpeg */
  accept?: string;
  /** 图片容器宽度 */
  width?: number;
  /** 图片容器高度 */
  height?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位文案 */
  placeholder?: string;
}

/**
 * 通用图片上传组件
 * - 支持点击/拖拽上传，预览已上传图片
 * - 文件格式校验 (JPG/PNG)
 * - 文件大小校验 (< 2MB)
 * - 上传中 Loading 态，失败保留已选文件
 */
const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  maxSizeMB = 2,
  accept = 'image/png,image/jpeg',
  width = 120,
  height = 168,
  disabled = false,
  placeholder = '上传图片',
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
  const { message } = App.useApp();

  // 同步外部 value 变化
  React.useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  const beforeUpload = (file: File): boolean => {
    // 类型校验
    const isImage = file.type === 'image/png' || file.type === 'image/jpeg';
    if (!isImage) {
      message.error('仅支持 JPG / PNG 格式的图片');
      return false;
    }

    // 大小校验
    const isUnderLimit = file.size / 1024 / 1024 < maxSizeMB;
    if (!isUnderLimit) {
      message.error(`图片大小不能超过 ${maxSizeMB}MB`);
      return false;
    }

    // 转 base64 预览
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      onChange?.(result);
      setUploading(false);
    };
    reader.onerror = () => {
      message.error('图片读取失败，请重试');
      setUploading(false);
    };
    reader.readAsDataURL(file);

    // 阻止 antd 默认上传行为
    return false;
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onChange?.('');
  };

  const containerClassName = disabled
    ? `${styles.container} ${styles.containerDisabled}`
    : `${styles.container} ${styles.containerEnabled}`;

  // 有图片：预览模式
  if (previewUrl) {
    return (
      <div className={styles.previewWrapper}>
        <div className={containerClassName} style={{ width, height }}>
          <img
            src={previewUrl}
            alt="预览"
            className={styles.previewImage}
          />
        </div>
        {!disabled && (
          <Button
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={handleRemove}
            className={styles.removeButton}
          />
        )}
      </div>
    );
  }

  // 无图片：上传模式
  return (
    <Upload
      beforeUpload={beforeUpload}
      showUploadList={false}
      disabled={disabled || uploading}
      accept={accept}
    >
      <div className={containerClassName} style={{ width, height }}>
        {uploading ? (
          <>
            <Loader size={24} color="#1677ff" />
            <span className={styles.hintText}>读取中...</span>
          </>
        ) : (
          <>
            <UploadCloud size={20} color="#999" />
            <span className={styles.hintText}>{placeholder}</span>
            <span className={styles.subHint}>
              JPG/PNG, ≤{maxSizeMB}MB
            </span>
          </>
        )}
      </div>
    </Upload>
  );
};

export default ImageUpload;
