import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from 'antd';
import { Search, X } from 'lucide-react';
import type { InputProps } from 'antd';
import styles from './SearchBar.module.css';

/**
 * 搜索输入组件属性
 * 扩展自 antd InputProps，移除了 onChange/value/defaultValue（由组件内部管理）
 */
export interface SearchBarProps extends Omit<InputProps, 'onChange' | 'value' | 'defaultValue'> {
  /** 搜索回调（输入停止 debounceMs 后触发） */
  onSearch?: (value: string) => void;
  /** 回车立即搜索回调 */
  onEnter?: (value: string) => void;
  /** 初始值 */
  defaultValue?: string;
  /** 防抖延迟（ms），默认 300 */
  debounceMs?: number;
  /** 值变化回调（未经防抖，实时响应） */
  onValueChange?: (value: string) => void;
  /** 是否显示清除按钮，默认 true */
  allowClear?: boolean;
}

/**
 * 通用搜索输入组件
 * - 输入内容 debounceMs 防抖后触发 onSearch
 * - 回车键立即搜索（清除防抖定时器）
 * - 内置搜索图标和清除按钮
 * - 首次挂载不触发搜索（跳过初始渲染）
 */
const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onEnter,
  defaultValue = '',
  debounceMs = 300,
  onValueChange,
  placeholder = '请输入关键词搜索',
  allowClear = true,
  style,
  ...rest
}) => {
  // 当前输入值
  const [value, setValue] = useState(defaultValue);
  // 防抖定时器引用
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 是否首次渲染标记（首次不触发搜索）
  const isFirstRender = useRef(true);

  // 防抖搜索 effect
  useEffect(() => {
    // 跳过首次挂载，避免初始渲染触发搜索
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // 清除上一次防抖定时器
    if (timerRef.current) clearTimeout(timerRef.current);
    // 设置新的防抖定时器
    timerRef.current = setTimeout(() => {
      onSearch?.(value);
    }, debounceMs);
    // 卸载时清除定时器
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs]);

  /**
   * 输入变化处理
   * 更新内部状态并实时通知外部（onValueChange 未经防抖）
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      onValueChange?.(v);
    },
    [onValueChange],
  );

  /**
   * 键盘事件处理
   * 回车键立即搜索，清除防抖定时器
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // 回车时清除防抖，立即搜索
        if (timerRef.current) clearTimeout(timerRef.current);
        onSearch?.(value);
        onEnter?.(value);
      }
    },
    [value, onSearch, onEnter],
  );

  /**
   * 清除搜索内容
   * 清空输入值并立即触发搜索（返回空值）
   */
  const handleClear = useCallback(() => {
    setValue('');
    onValueChange?.('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch?.('');
  }, [onSearch, onValueChange]);

  return (
    <Input
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      // 搜索图标前缀
      prefix={<Search size={14} color="#9ca3af" />}
      // 清除按钮后缀（有值时显示）
      suffix={
        allowClear && value ? (
          <X
            size={14}
            color="#9ca3af"
            className={styles.clearIcon}
            onClick={handleClear}
          />
        ) : undefined
      }
      allowClear={false}
      style={{ ...style }}
      {...rest}
    />
  );
};

export default SearchBar;
