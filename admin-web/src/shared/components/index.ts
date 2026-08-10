/**
 * 通用组件模块导出
 * 统一导出所有共享组件及其类型定义
 */

// 数据表格组件
export { default as DataTable } from './DataTable';
export type { DataTableProps, DataTableColumnConfig } from './DataTable';

// 新增/编辑弹窗组件
export { default as EditModal } from './EditModal';
export type { EditModalProps } from './EditModal';

// 图片上传组件
export { default as ImageUpload } from './ImageUpload';
export type { ImageUploadProps } from './ImageUpload';

// 地图选点组件
export { default as MapPicker } from './MapPicker';
export type { Coordinate, MapPickerProps } from './MapPicker';

// 搜索输入组件
export { default as SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';

// 状态标签组件
export { default as StatusTag } from './StatusTag';
export type { StatusConfig, StatusTagProps } from './StatusTag';
