import { useState, useMemo, useEffect, useRef } from 'react';
import {
  EditOutlined,
  TeamOutlined,
  DashOutlined,
  CloseOutlined,
  SaveOutlined,
  BorderOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import { Button, Space, Typography, App } from 'antd';
import type { SeatItem } from './types';
import { SEAT_STATUS, generateSeats, countAvailableSeats } from './store';
import { SeatLegend } from './SeatLegend';
import styles from './HallPage.module.css';

/** 座位布局查看器组件属性 */
interface SeatLayoutViewerProps {
  /** 总行数 */
  rowCount: number;
  /** 总列数 */
  colCount: number;
  /** 座位列表 */
  seats: SeatItem[];
  /** 保存布局回调 */
  onSave: (data: { seats: SeatItem[]; totalSeats: number }) => void;
}

/**
 * 座位布局查看器组件
 *
 * 功能：
 * 1. 默认只读模式，展示座位布局
 * 2. 点击"编辑布局"进入编辑模式
 * 3. 编辑模式支持：
 *    - Ctrl/Cmd + 点击多选座位
 *    - 鼠标拖拽框选座位
 *    - 批量设为过道
 *    - 全选/清空/重置
 * 4. 保存布局后退出编辑模式
 * 5. ESC 键清空选择或取消编辑
 *
 * 显示上限：20行 × 24列
 */
export function SeatLayoutViewer({
  rowCount,
  colCount,
  seats: initialSeats,
  onSave,
}: SeatLayoutViewerProps) {
  // 是否编辑模式
  const [isEditMode, setIsEditMode] = useState(false);
  const { message } = App.useApp();
  // 编辑中的临时座位列表
  const [tempSeats, setTempSeats] = useState<SeatItem[]>(() => initialSeats.length ? initialSeats : generateSeats(rowCount, colCount));
  // 选中的座位 key 集合（格式 "row-col"）
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  // 鼠标拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [, setDragCurrent] = useState<{ row: number; col: number } | null>(null);
  // Ctrl/Cmd 键是否按下（用于多选）
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // 当前使用的座位列表（编辑模式用 tempSeats，查看模式用 initialSeats）
  const currentSeats = useMemo(() => isEditMode ? tempSeats : initialSeats, [isEditMode, tempSeats, initialSeats]);
  // 可用座位数
  const availableSeats = useMemo(() => countAvailableSeats(currentSeats), [currentSeats]);
  // 选中座位数
  const selectedCount = selectedSeats.size;

  /**
   * 键盘事件监听
   * - Ctrl/Cmd 按下：启用多选模式
   * - ESC：有选中则清空，否则取消编辑
   */
  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) setIsCtrlPressed(true);
      if (e.key === 'Escape') {
        if (selectedCount > 0) setSelectedSeats(new Set());
        else if (isEditMode) cancelEdit();
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) setIsCtrlPressed(false);
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [isEditMode, selectedCount]);

  /** 获取指定行列的座位状态 */
  const getSeatStatus = (r: number, c: number) => currentSeats.find(s => s.row === r && s.col === c)?.status || SEAT_STATUS.AVAILABLE;
  /** 判断座位是否被选中 */
  const isSeatSelected = (r: number, c: number) => selectedSeats.has(`${r}-${c}`);

  /** 切换单个座位选中状态 */
  const toggleSeatSelection = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const next = new Set<string>(selectedSeats);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedSeats(next);
  };

  /**
   * 座位点击处理（编辑模式）
   * - Ctrl 按下：切换多选
   * - 普通点击：单选
   */
  const handleSeatClick = (r: number, c: number) => {
    if (!isEditMode) return;
    if (isCtrlPressed) toggleSeatSelection(r, c);
    else setSelectedSeats(new Set([`${r}-${c}`]));
  };

  /**
   * 鼠标按下：开始拖拽框选
   */
  const handleMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (!isEditMode || e.button !== 0) return e.preventDefault();
    setIsDragging(true);
    setDragStart({ row: r, col: c });
    setDragCurrent({ row: r, col: c });
    if (!isCtrlPressed) setSelectedSeats(new Set<string>());
  };

  /**
   * 鼠标移动：更新拖拽选中范围
   * 计算从拖拽起点到当前点的矩形区域，选中区域内所有座位
   */
  const handleMouseMove = (e: React.MouseEvent, r: number, c: number) => {
    if (!isDragging || !isEditMode || !dragStart) return e.preventDefault();
    setDragCurrent({ row: r, col: c });
    const minR = Math.min(dragStart.row, r);
    const maxR = Math.max(dragStart.row, r);
    const minC = Math.min(dragStart.col, c);
    const maxC = Math.max(dragStart.col, c);
    // Ctrl 模式下保留之前选中的座位
    const next = isCtrlPressed ? new Set<string>(selectedSeats) : new Set<string>();
    for (let rr = minR; rr <= maxR; rr++) for (let cc = minC; cc <= maxC; cc++) next.add(`${rr}-${cc}`);
    setSelectedSeats(next);
  };

  /** 鼠标抬起：结束拖拽 */
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  // 全局 mouseup 监听（防止鼠标离开座位区域后拖拽状态不重置）
  useEffect(() => {
    const globalUp = () => handleMouseUp();
    window.addEventListener('mouseup', globalUp);
    return () => window.removeEventListener('mouseup', globalUp);
  }, [isDragging]);

  /** 全选所有座位 */
  const selectAllSeats = () => {
    const all = new Set<string>();
    for (let r = 1; r <= rowCount; r++) for (let c = 1; c <= colCount; c++) all.add(`${r}-${c}`);
    setSelectedSeats(all);
  };

  /** 清空选中 */
  const clearSelection = () => setSelectedSeats(new Set());

  /**
   * 将选中的座位设为过道
   */
  const setSelectedAsAisle = () => {
    if (!isEditMode || selectedCount === 0) return;
    const next = tempSeats.map(s => selectedSeats.has(`${s.row}-${s.col}`) ? { ...s, status: SEAT_STATUS.AISLE } : s);
    setTempSeats(next);
    clearSelection();
    message.success(`已将 ${selectedCount} 个座位设为过道`);
  };

  /**
   * 重置所有座位为可用
   */
  const resetAllAisles = () => {
    if (!isEditMode) return;
    const next = tempSeats.map(s => ({ ...s, status: SEAT_STATUS.AVAILABLE }));
    setTempSeats(next);
    clearSelection();
    message.success('已重置所有座位为可用');
  };

  /** 进入编辑模式 */
  const enterEditMode = () => {
    setIsEditMode(true);
    setTempSeats(initialSeats.length ? [...initialSeats] : generateSeats(rowCount, colCount));
    setSelectedSeats(new Set());
  };

  /** 取消编辑，恢复原始座位 */
  const cancelEdit = () => {
    setIsEditMode(false);
    setTempSeats(initialSeats.length ? [...initialSeats] : generateSeats(rowCount, colCount));
    setSelectedSeats(new Set());
  };

  /** 保存编辑结果并退出编辑模式 */
  const saveEdit = () => {
    if (!isEditMode) return;
    onSave({ seats: tempSeats, totalSeats: countAvailableSeats(tempSeats) });
    setIsEditMode(false);
    setSelectedSeats(new Set());
  };

  // 显示上限
  const maxDisplayRows = Math.min(rowCount, 20);
  const maxDisplayCols = Math.min(colCount, 24);

  return (
    <div className={styles.viewerWrap}>
      {/* 顶部工具栏 */}
      <div className={styles.viewerToolbar}>
        <div className={styles.toolbarLeft}>
          {/* 可用座位数 */}
          <Space size={8}>
            <TeamOutlined style={{ fontSize: 16, color: '#1677ff' }} />
            <Typography.Text className={styles.statLabel}>可用座位：</Typography.Text>
            <Typography.Text strong className={styles.statValueBlue}>{availableSeats}</Typography.Text>
          </Space>
          {/* 过道数 */}
          <Space size={8}>
            <DashOutlined style={{ fontSize: 16, color: '#999' }} />
            <Typography.Text className={styles.statLabel}>过道：</Typography.Text>
            <Typography.Text strong className={styles.statValueGray}>{currentSeats.length - availableSeats}</Typography.Text>
          </Space>
          {/* 编辑模式下显示选中数量 */}
          {isEditMode && selectedCount > 0 && (
            <div className={styles.selectedInfo}>
              <CheckSquareOutlined style={{ fontSize: 16, color: '#f59e0b' }} />
              <Typography.Text className={styles.selectedInfoText}>已选择 {selectedCount} 个座位</Typography.Text>
            </div>
          )}
        </div>
        <Space size={8}>
          {/* 工具栏按钮区 */}
          {!isEditMode ? (
            // 查看模式：仅显示"编辑布局"按钮
            <Button type='primary' size='small' icon={<EditOutlined style={{ fontSize: 16 }} />} onClick={enterEditMode}>编辑布局</Button>
          ) : (
            // 编辑模式：显示操作按钮组
            <>
              <Typography.Text className={styles.hintText}>Ctrl/Cmd+点击多选，拖拽框选</Typography.Text>
              <Button size='small' icon={<BorderOutlined style={{ fontSize: 14 }} />} onClick={selectAllSeats}>全选</Button>
              {selectedCount > 0 && (
                <>
                  <Button size='small' onClick={clearSelection}>清空</Button>
                  <Button size='small' danger onClick={setSelectedAsAisle}>设为过道</Button>
                </>
              )}
              <Button size='small' onClick={resetAllAisles}>重置所有</Button>
            </>
          )}
        </Space>
      </div>

      {/* 座位画布 */}
      <div className={styles.viewerGridBox}>
        {/* 银幕标识 */}
        <div className={styles.screenWrap}><div className={styles.screenInner}>银 幕</div></div>
        {/* 座位网格（监听鼠标离开结束拖拽） */}
        <div ref={gridRef} onMouseLeave={handleMouseUp}>
          {Array.from({ length: maxDisplayRows }).map((_, rowIdx) => {
            const r = rowIdx + 1;
            return (
              <div key={r} className={styles.seatRowWrap}>
                {/* 行号 */}
                <span className={styles.rowLabel}>{r}</span>
                {Array.from({ length: maxDisplayCols }).map((_, colIdx) => {
                  const c = colIdx + 1;
                  const status = getSeatStatus(r, c);
                  const sel = isSeatSelected(r, c);
                  const isAisle = status === SEAT_STATUS.AISLE;
                  return (
                    <div
                      key={c}
                      // 根据状态设置样式：过道/选中/可用
                      className={`${styles.seat} ${isAisle ? styles.seatAisle : sel ? styles.seatSelected : styles.seatAvailable}`}
                      onMouseDown={(e) => handleMouseDown(e, r, c)}
                      onMouseMove={(e) => handleMouseMove(e, r, c)}
                      onClick={() => handleSeatClick(r, c)}
                      title={`${r}排${c}列`}
                    />
                  );
                })}
              </div>
            );
          })}
          {/* 列号行 */}
          <div className={styles.colNumberRow}>
            <span className={styles.rowLabel} />
            {Array.from({ length: maxDisplayCols }).map((_, i) => (
              <span key={i} className={styles.colNumber}>{i + 1}</span>
            ))}
          </div>
        </div>
        {/* 超出显示上限的提示 */}
        {(rowCount > maxDisplayRows || colCount > maxDisplayCols) && (
          <Typography.Text className={styles.displayLimitText}>
            显示范围：最多 {maxDisplayRows} 行 × {maxDisplayCols} 列，实际布局 {rowCount}行 × {colCount}列
          </Typography.Text>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className={styles.viewerFooter}>
        {/* 座位图例 */}
        <SeatLegend />
        {isEditMode ? (
          // 编辑模式：取消/保存按钮
          <Space size={12}>
            <Button onClick={cancelEdit} icon={<CloseOutlined style={{ fontSize: 16 }} />}>取消</Button>
            <Button type='primary' onClick={saveEdit} icon={<SaveOutlined style={{ fontSize: 16 }} />}>保存布局</Button>
          </Space>
        ) : (
          // 查看模式：行列信息
          <Typography.Text className={styles.hintText}>{rowCount}行 × {colCount}列</Typography.Text>
        )}
      </div>
    </div>
  );
}
