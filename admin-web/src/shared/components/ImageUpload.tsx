import React, { useState } from 'react';
import { Upload, Button, App } from 'antd';
import { UploadCloud, Loader, Trash2 } from 'lucide-react';
import styles from './ImageUpload.module.css';

/** 图片上传组件属性 */
export interface ImageUploadProps {
  /** 当前图片 URL 或 base64 数据 */
  value?: string;
  /** 图片值变更回调 */
  onChange?: (url: string) => void;
  /** 最大文件大小（MB），默认 2 */
  maxSizeMB?: number;
  /** 接受的文件类型，默认 image/png,image/jpeg */
  accept?: string;
  /** 图片容器宽度（px） */
  width?: number;
  /** 图片容器高度（px） */
  height?: number;
  /** 是否禁用上传 */
  disabled?: boolean;
  /** 上传区域占位文案 */
  placeholder?: string;
}

/**
 * 通用图片上传组件
 * - 支持点击上传，预览已上传图片
 * - 文件格式校验 (JPG/PNG)
 * - 文件大小校验 (< maxSizeMB)
 * - 上传中 Loading 态，失败保留已选文件
 * - 图片以 base64 格式存储（前端预览），适合小图
 * - 支持删除已上传图片
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
  // 上传中状态
  const [uploading, setUploading] = useState(false);
  // 图片预览 URL
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
  const { message } = App.useApp();

  // 同步外部 value 变化（编辑模式回填）
  React.useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  /**
   * 文件上传前校验和预处理
   * - 校验文件类型（仅 JPG/PNG）
   * - 校验文件大小（不超过 maxSizeMB）
   * - 将文件转为 base64 供预览和存储
   * - 返回 false 阻止 antd 默认上传行为
   */
  const beforeUpload = (file: File): boolean => {
    // 类型校验：仅支持 JPG / PNG
    const isImage = file.type === 'image/png' || file.type === 'image/jpeg';
    if (!isImage) {
      message.error('仅支持 JPG / PNG 格式的图片');
      return false;
    }

    // 大小校验：不超过 maxSizeMB
    const isUnderLimit = file.size / 1024 / 1024 < maxSizeMB;
    if (!isUnderLimit) {
      message.error(`图片大小不能超过 ${maxSizeMB}MB`);
      return false;
    }

    // 读取文件为 base64 进行预览
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

    // 阻止 antd 默认上传行为（我们只做本地 base64 预览）
    return false;
  };

  /**
   * 删除已上传图片
   * 清空预览并通知外部
   */
  const handleRemove = () => {
    setPreviewUrl(undefined);
    onChange?.('');
  };

  // 根据禁用状态设置容器样式
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
        {/* 未禁用时显示删除按钮 */}
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
          // 上传中：显示 Loading
          <>
            <Loader size={24} color="#1677ff" />
            <span className={styles.hintText}>读取中...</span>
          </>
        ) : (
          // 待上传：显示上传提示
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
