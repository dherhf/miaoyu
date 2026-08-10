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
import { Button, Space, Typography } from 'antd';
import { message } from "@/shared/utils/globalMessage";
import type { SeatItem } from './types';
import { SEAT_STATUS, generateSeats, countAvailableSeats } from './store';
import { SeatLegend } from './SeatLegend';
import styles from './HallPage.module.css';

interface SeatLayoutViewerProps {
  rowCount: number;
  colCount: number;
  seats: SeatItem[];
  onSave: (data: { seats: SeatItem[]; totalSeats: number }) => void;
}

export function SeatLayoutViewer({
  rowCount,
  colCount,
  seats: initialSeats,
  onSave,
}: SeatLayoutViewerProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempSeats, setTempSeats] = useState<SeatItem[]>(() => initialSeats.length ? initialSeats : generateSeats(rowCount, colCount));
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [, setDragCurrent] = useState<{ row: number; col: number } | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const currentSeats = useMemo(() => isEditMode ? tempSeats : initialSeats, [isEditMode, tempSeats, initialSeats]);
  const availableSeats = useMemo(() => countAvailableSeats(currentSeats), [currentSeats]);
  const selectedCount = selectedSeats.size;

  // 键盘监听
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

  const getSeatStatus = (r: number, c: number) => currentSeats.find(s => s.row === r && s.col === c)?.status || SEAT_STATUS.AVAILABLE;
  const isSeatSelected = (r: number, c: number) => selectedSeats.has(`${r}-${c}`);
  const toggleSeatSelection = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const next = new Set<string>(selectedSeats);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedSeats(next);
  };

  const handleSeatClick = (r: number, c: number) => {
    if (!isEditMode) return;
    if (isCtrlPressed) toggleSeatSelection(r, c);
    else setSelectedSeats(new Set([`${r}-${c}`]));
  };

  const handleMouseDown = (e: React.MouseEvent, r: number, c: number) => {
    if (!isEditMode || e.button !== 0) return e.preventDefault();
    setIsDragging(true);
    setDragStart({ row: r, col: c });
    setDragCurrent({ row: r, col: c });
    if (!isCtrlPressed) setSelectedSeats(new Set<string>());
  };
  const handleMouseMove = (e: React.MouseEvent, r: number, c: number) => {
    if (!isDragging || !isEditMode || !dragStart) return e.preventDefault();
    setDragCurrent({ row: r, col: c });
    const minR = Math.min(dragStart.row, r);
    const maxR = Math.max(dragStart.row, r);
    const minC = Math.min(dragStart.col, c);
    const maxC = Math.max(dragStart.col, c);
    const next = isCtrlPressed ? new Set<string>(selectedSeats) : new Set<string>();
    for (let rr = minR; rr <= maxR; rr++) for (let cc = minC; cc <= maxC; cc++) next.add(`${rr}-${cc}`);
    setSelectedSeats(next);
  };
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    }
  };
  useEffect(() => {
    const globalUp = () => handleMouseUp();
    window.addEventListener('mouseup', globalUp);
    return () => window.removeEventListener('mouseup', globalUp);
  }, [isDragging]);

  const selectAllSeats = () => {
    const all = new Set<string>();
    for (let r = 1; r <= rowCount; r++) for (let c = 1; c <= colCount; c++) all.add(`${r}-${c}`);
    setSelectedSeats(all);
  };
  const clearSelection = () => setSelectedSeats(new Set());

  const setSelectedAsAisle = () => {
    if (!isEditMode || selectedCount === 0) return;
    const next = tempSeats.map(s => selectedSeats.has(`${s.row}-${s.col}`) ? { ...s, status: SEAT_STATUS.AISLE } : s);
    setTempSeats(next);
    clearSelection();
    message.success(`已将 ${selectedCount} 个座位设为过道`);
  };
  const resetAllAisles = () => {
    if (!isEditMode) return;
    const next = tempSeats.map(s => ({ ...s, status: SEAT_STATUS.AVAILABLE }));
    setTempSeats(next);
    clearSelection();
    message.success('已重置所有座位为可用');
  };

  const enterEditMode = () => {
    setIsEditMode(true);
    setTempSeats(initialSeats.length ? [...initialSeats] : generateSeats(rowCount, colCount));
    setSelectedSeats(new Set());
  };
  const cancelEdit = () => {
    setIsEditMode(false);
    setTempSeats(initialSeats.length ? [...initialSeats] : generateSeats(rowCount, colCount));
    setSelectedSeats(new Set());
  };
  const saveEdit = () => {
    if (!isEditMode) return;
    onSave({ seats: tempSeats, totalSeats: countAvailableSeats(tempSeats) });
    setIsEditMode(false);
    setSelectedSeats(new Set());
  };

  const maxDisplayRows = Math.min(rowCount, 20);
  const maxDisplayCols = Math.min(colCount, 24);

  return (
    <div className={styles.viewerWrap}>
      {/* 顶部工具栏 */}
      <div className={styles.viewerToolbar}>
        <div className={styles.toolbarLeft}>
          <Space size={8}>
            <TeamOutlined style={{ fontSize: 16, color: '#1677ff' }} />
            <Typography.Text className={styles.statLabel}>可用座位：</Typography.Text>
            <Typography.Text strong className={styles.statValueBlue}>{availableSeats}</Typography.Text>
          </Space>
          <Space size={8}>
            <DashOutlined style={{ fontSize: 16, color: '#999' }} />
            <Typography.Text className={styles.statLabel}>过道：</Typography.Text>
            <Typography.Text strong className={styles.statValueGray}>{currentSeats.length - availableSeats}</Typography.Text>
          </Space>
          {isEditMode && selectedCount > 0 && (
            <div className={styles.selectedInfo}>
              <CheckSquareOutlined style={{ fontSize: 16, color: '#f59e0b' }} />
              <Typography.Text className={styles.selectedInfoText}>已选择 {selectedCount} 个座位</Typography.Text>
            </div>
          )}
        </div>
        <Space size={8}>
          {!isEditMode ? (
            <Button type='primary' size='small' icon={<EditOutlined style={{ fontSize: 16 }} />} onClick={enterEditMode}>编辑布局</Button>
          ) : (
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
        <div className={styles.screenWrap}><div className={styles.screenInner}>银 幕</div></div>
        <div ref={gridRef} onMouseLeave={handleMouseUp}>
          {Array.from({ length: maxDisplayRows }).map((_, rowIdx) => {
            const r = rowIdx + 1;
            return (
              <div key={r} className={styles.seatRowWrap}>
                <span className={styles.rowLabel}>{r}</span>
                {Array.from({ length: maxDisplayCols }).map((_, colIdx) => {
                  const c = colIdx + 1;
                  const status = getSeatStatus(r, c);
                  const sel = isSeatSelected(r, c);
                  const isAisle = status === SEAT_STATUS.AISLE;
                  return (
                    <div
                      key={c}
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
          {/* 列号 */}
          <div className={styles.colNumberRow}>
            <span className={styles.rowLabel} />
            {Array.from({ length: maxDisplayCols }).map((_, i) => (
              <span key={i} className={styles.colNumber}>{i + 1}</span>
            ))}
          </div>
        </div>
        {(rowCount > maxDisplayRows || colCount > maxDisplayCols) && (
          <Typography.Text className={styles.displayLimitText}>
            显示范围：最多 {maxDisplayRows} 行 × {maxDisplayCols} 列，实际布局 {rowCount}行 × {colCount}列
          </Typography.Text>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className={styles.viewerFooter}>
        <SeatLegend />
        {isEditMode ? (
          <Space size={12}>
            <Button onClick={cancelEdit} icon={<CloseOutlined style={{ fontSize: 16 }} />}>取消</Button>
            <Button type='primary' onClick={saveEdit} icon={<SaveOutlined style={{ fontSize: 16 }} />}>保存布局</Button>
          </Space>
        ) : (
          <Typography.Text className={styles.hintText}>{rowCount}行 × {colCount}列</Typography.Text>
        )}
      </div>
    </div>
  );
}
