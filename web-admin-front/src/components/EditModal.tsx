import React, { useCallback } from 'react';
import { Modal, Button, Space } from 'antd';
import type { ModalProps } from 'antd';

export interface EditModalProps extends Omit<ModalProps, 'onOk' | 'onCancel' | 'confirmLoading'> {
  /** 是否新增模式（false = 编辑模式），影响标题和按钮文案 */
  isCreate?: boolean;
  /** 实体名称，用于自动生成标题，如 "影片" → "新增影片" / "编辑影片" */
  entityName?: string;
  /** 确认回调 */
  onConfirm?: () => void | Promise<void>;
  /** 取消回调 */
  onClose?: () => void;
  /** 提交 loading 态 */
  submitting?: boolean;
  /** 确认按钮文案（覆盖默认） */
  okText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
}

/**
 * 通用新增/编辑弹窗组件
 * - 自动根据 isCreate 生成标题："新增{entityName}" / "编辑{entityName}"
 * - 点击确认时自动进入 loading 态
 * - 支持异步确认 (Promise) 和同步确认
 * - 底部统一 [取消] [确认] 按钮
 *
 * @example
 * <EditModal
 *   open={visible}
 *   entityName="影片"
 *   isCreate={!editingRecord}
 *   onConfirm={handleSubmit}
 *   onClose={() => setVisible(false)}
 * >
 *   <MovieForm ... />
 * </EditModal>
 */
const EditModal: React.FC<EditModalProps> = ({
  isCreate = true,
  entityName = '',
  onConfirm,
  onClose,
  submitting = false,
  okText,
  cancelText = '取消',
  title,
  children,
  ...rest
}) => {
  const resolvedTitle =
    title ?? (isCreate ? `新增${entityName}` : `编辑${entityName}`);

  const resolvedOkText = okText ?? (isCreate ? '确认新增' : '保存');

  const handleOk = useCallback(async () => {
    if (!onConfirm) return;
    await onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      title={resolvedTitle}
      maskClosable={false}
      width={620}
      onCancel={onClose}
      confirmLoading={submitting}
      footer={
        <Space>
          <Button onClick={onClose} disabled={submitting}>
            {cancelText}
          </Button>
          <Button type="primary" loading={submitting} onClick={handleOk}>
            {resolvedOkText}
          </Button>
        </Space>
      }
      {...rest}
    >
      {children}
    </Modal>
  );
};

export default EditModal;
