import { useMemo } from 'react';
import {
  PlusOutlined,
  MinusOutlined,
  TeamOutlined,
  ColumnWidthOutlined,
  DashOutlined,
} from '@ant-design/icons';
import { Button, Card, Space, Typography, message } from 'antd';
import type { SeatItem } from './types';
import { SEAT_STATUS, countAvailableSeats, addRow, removeRow, addCol, removeCol } from './store';
import { SeatLegend } from './SeatLegend';
import styles from './HallPage.module.css';

interface SeatLayoutEditorProps {
  value?: SeatItem[];
  onChange?: (list: SeatItem[]) => void;
}

export function SeatLayoutEditor({ value, onChange }: SeatLayoutEditorProps) {
  const currentSeats = value || [];
  const emit = (list: SeatItem[]) => onChange?.(list);
  const rowCount = useMemo(() => currentSeats.length ? Math.max(...currentSeats.map(s => s.row)) : 0, [currentSeats]);
  const colCount = useMemo(() => currentSeats.length ? Math.max(...currentSeats.map(s => s.col)) : 0, [currentSeats]);
  const availableSeats = useMemo(() => countAvailableSeats(currentSeats), [currentSeats]);

  const toggleSeat = (r: number, c: number) => {
    const next = currentSeats.map(s => s.row === r && s.col === c ? { ...s, status: s.status === SEAT_STATUS.AISLE ? SEAT_STATUS.AVAILABLE : SEAT_STATUS.AISLE } : s);
    emit(next);
  };
  const toggleRow = (r: number, setAisle: boolean) => {
    const next = currentSeats.map(s => s.row === r ? { ...s, status: setAisle ? SEAT_STATUS.AISLE : SEAT_STATUS.AVAILABLE } : s);
    emit(next);
  };
  const toggleCol = (c: number, setAisle: boolean) => {
    const next = currentSeats.map(s => s.col === c ? { ...s, status: setAisle ? SEAT_STATUS.AISLE : SEAT_STATUS.AVAILABLE } : s);
    emit(next);
  };
  const isRowAllAisle = (r: number) => currentSeats.filter(s => s.row === r).every(s => s.status === SEAT_STATUS.AISLE);
  const isColAllAisle = (c: number) => currentSeats.filter(s => s.col === c).every(s => s.status === SEAT_STATUS.AISLE);
  const clearAllAisles = () => emit(currentSeats.map(s => ({ ...s, status: SEAT_STATUS.AVAILABLE })));
  const setMiddleColumnAisle = () => {
    const mid = Math.ceil(colCount / 2);
    const next = currentSeats.map(s => s.col === mid || s.col === mid + 1 ? { ...s, status: SEAT_STATUS.AISLE } : s);
    emit(next);
  };
  const onAddRow = () => {
    const res = addRow(currentSeats);
    if ('error' in res) message.error(res.error);
    else emit(res);
  };
  const onRemoveRow = () => {
    if (rowCount <= 1) return message.error('至少保留一行');
    const res = removeRow(currentSeats);
    if ('error' in res) message.error(res.error);
    else emit(res);
  };
  const onAddCol = () => {
    const res = addCol(currentSeats);
    if ('error' in res) message.error(res.error);
    else emit(res);
  };
  const onRemoveCol = () => {
    if (colCount <= 1) return message.error('至少保留一列');
    const res = removeCol(currentSeats);
    if ('error' in res) message.error(res.error);
    else emit(res);
  };

  return (
    <div className={styles.editorWrap}>
      {/* 统计栏 */}
      <div className={styles.statBox}>
        <Space size={16}>
          <Typography.Text className={styles.normalText}>{rowCount} 行 × {colCount} （共{currentSeats.length}座）</Typography.Text>
          <Space size={6}><TeamOutlined style={{ fontSize: 16, color: '#1677ff' }} /><Typography.Text className={styles.normalText}>可用：{availableSeats}</Typography.Text></Space>
          <Space size={6}><DashOutlined style={{ fontSize: 16, color: '#999' }} /><Typography.Text className={styles.normalText}>过道：{currentSeats.length - availableSeats}</Typography.Text></Space>
        </Space>
        <Space size={8}>
          <Button size='small' icon={<ColumnWidthOutlined style={{ fontSize: 14 }} />} onClick={setMiddleColumnAisle}>中间过道</Button>
          <Button size='small' onClick={clearAllAisles}>清除所有过道</Button>
        </Space>
      </div>
      {/* 行列操作 */}
      <div className={styles.rowColOps}>
        <Space>
          <Typography.Text className={styles.opLabelText}>行操作：</Typography.Text>
          <Button size='small' icon={<PlusOutlined style={{ fontSize: 12 }} />} onClick={onAddRow}>添加行</Button>
          <Button size='small' danger icon={<MinusOutlined style={{ fontSize: 12 }} />} disabled={rowCount <= 1} onClick={onRemoveRow}>删除行</Button>
        </Space>
        <Space>
          <Typography.Text className={styles.opLabelText}>列操作：</Typography.Text>
          <Button size='small' icon={<PlusOutlined style={{ fontSize: 12 }} />} onClick={onAddCol}>添加列</Button>
          <Button size='small' danger icon={<MinusOutlined style={{ fontSize: 12 }} />} disabled={colCount <= 1} onClick={onRemoveCol}>删除列</Button>
        </Space>
      </div>
      {/* 座位画布 */}
      <div className={styles.editorGridBox}>
        <div className={styles.editorScreenWrap}>
          <div className={styles.screenInner}>银 幕</div>
        </div>
        {/* 列按钮 */}
        <div className={styles.colButtonRow}>
          <span className={styles.colSpacer} />
          {Array.from({ length: Math.min(colCount, 24) }).map((_, idx) => {
            const c = idx + 1;
            const allA = isColAllAisle(c);
            return (
              <Button
                key={c}
                size='small'
                className={styles.colButton}
                danger={allA}
                onClick={() => toggleCol(c, !allA)}
              >{c}</Button>
            );
          })}
        </div>
        {/* 座位行 */}
        {Array.from({ length: Math.min(rowCount, 20) }).map((_, idx) => {
          const r = idx + 1;
          const rowAll = isRowAllAisle(r);
          return (
            <div key={r} className={styles.seatRowWrap}>
              <Button
                size='small'
                className={styles.rowButton}
                danger={rowAll}
                onClick={() => toggleRow(r, !rowAll)}
              >{r}</Button>
              {Array.from({ length: Math.min(colCount, 24) }).map((_, cIdx) => {
                const c = cIdx + 1;
                const seat = currentSeats.find(s => s.row === r && s.col === c);
                const aisle = seat?.status === SEAT_STATUS.AISLE;
                return (
                  <div
                    key={c}
                    onClick={() => toggleSeat(r, c)}
                    className={`${styles.editorSeat} ${aisle ? styles.editorSeatAisle : styles.editorSeatAvailable}`}
                    title={`${r}排${c}列 ${aisle ? '过道' : '可用'}`}
                  />
                );
              })}
            </div>
          );
        })}
        {(rowCount > 20 || colCount > 24) && (
          <Typography.Text className={styles.displayLimitText}>
            编辑器显示上限20行×24列，实际 {rowCount}行 × {colCount}列
          </Typography.Text>
        )}
      </div>
      {/* 图例 */}
      <Card size='small' styles={{ body: { padding: 12 } }}>
        <SeatLegend />
      </Card>
      <Typography.Text className={styles.opLabelText}>
        • 点击座位切换可用/过道 | 点击行列号批量切换 | 过道售票不可选
      </Typography.Text>
    </div>
  );
}
