import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from 'antd';
import { Search, X } from 'lucide-react';
import type { InputProps } from 'antd';

export interface SearchBarProps extends Omit<InputProps, 'onChange' | 'value' | 'defaultValue'> {
  /** 搜索回调（300ms 防抖） */
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
 * - 输入内容 300ms 防抖后触发 onSearch
 * - 回车键立即搜索
 * - 内置搜索图标和清除按钮
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
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // 防抖搜索
  useEffect(() => {
    // 跳过首次挂载
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch?.(value);
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      onValueChange?.(v);
    },
    [onValueChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (timerRef.current) clearTimeout(timerRef.current);
        onSearch?.(value);
        onEnter?.(value);
      }
    },
    [value, onSearch, onEnter],
  );

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
      prefix={<Search size={14} color="#9ca3af" />}
      suffix={
        allowClear && value ? (
          <X
            size={14}
            color="#9ca3af"
            style={{ cursor: 'pointer' }}
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
