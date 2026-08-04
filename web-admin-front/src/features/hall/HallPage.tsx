import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusOutlined,
  MinusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  ColumnWidthOutlined,
  DashOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  SaveOutlined,
  BorderOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import {
  Layout,
  App as AntApp,
  Table,
  Modal,
  Form,
  Input,
  Button,
  Select,
  Tag,
  Space,
  Typography,
  Card,
} from 'antd';
import type { TableProps, ModalProps, FormProps } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCinemaStore } from '../cinema';
import {
  useHallStore,
  HALL_TYPES,
  HALL_STATUS_LABELS,
  SEAT_STATUS,
  generateSeats,
  countAvailableSeats,
  addRow,
  removeRow,
  addCol,
  removeCol,
} from './store';
import { useScheduleStore } from '../schedule';
import styles from './HallPage.module.css';

// ====================== TS 类型定义 ======================
type SeatStatusType = 'available' | 'aisle';
interface SeatItem {
  row: number;
  col: number;
  status: SeatStatusType;
}
interface HallItem {
  id: string | number;
  cinemaId: string | number;
  name: string;
  type: string;
  rowCount: number;
  colCount: number;
  totalSeats: number;
  seats: SeatItem[];
  status: string;
}
interface HallFormValues {
  name: string;
  type: string;
  rowCount: number;
  colCount: number;
  totalSeats: number;
  seats: SeatItem[];
}
interface HallFormErr {
  name?: string;
  type?: string;
  seats?: string;
}

// ====================== 座位图例组件 ======================
const SeatLegend: React.FC = () => {
  return (
    <div className={styles.legendWrap}>
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockAvailable}`} />
        <span>可用</span>
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockSold}`} />
        <span>已售</span>
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockAisle}`} />
        <span>过道</span>
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockSelected}`} />
        <span>选中</span>
      </div>
    </div>
  );
};

// ====================== 座位布局查看弹窗组件 ======================
interface SeatLayoutViewerProps {
  rowCount: number;
  colCount: number;
  seats: SeatItem[];
  hallId: string | number;
  onSave: (data: { seats: SeatItem[]; totalSeats: number }) => void;
  onCancel: () => void;
}
const SeatLayoutViewer: React.FC<SeatLayoutViewerProps> = ({
  rowCount,
  colCount,
  seats: initialSeats,
  hallId,
  onSave,
  onCancel,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempSeats, setTempSeats] = useState<SeatItem[]>(() => initialSeats || generateSeats(rowCount, colCount));
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ row: number; col: number } | null>(null);
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
    const next = new Set(selectedSeats);
    next.has(key) ? next.delete(key) : next.add(key);
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
    if (!isCtrlPressed) setSelectedSeats(new Set());
  };
  const handleMouseMove = (e: React.MouseEvent, r: number, c: number) => {
    if (!isDragging || !isEditMode || !dragStart) return e.preventDefault();
    setDragCurrent({ row: r, col: c });
    const minR = Math.min(dragStart.row, r);
    const maxR = Math.max(dragStart.row, r);
    const minC = Math.min(dragStart.col, c);
    const maxC = Math.max(dragStart.col, c);
    const next = isCtrlPressed ? new Set(selectedSeats) : new Set();
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
    setTempSeats([...initialSeats]);
    setSelectedSeats(new Set());
  };
  const cancelEdit = () => {
    setIsEditMode(false);
    setTempSeats([...initialSeats]);
    setSelectedSeats(new Set());
  };
  const saveEdit = () => {
    if (!isEditMode) return;
    onSave({ seats: tempSeats, totalSeats: countAvailableSeats(tempSeats) });
    setIsEditMode(false);
    setSelectedSeats(new Set());
  };

  const selectionRect = useMemo(() => {
    if (!isDragging || !dragStart || !dragCurrent) return null;
    return {
      row: Math.min(dragStart.row, dragCurrent.row),
      col: Math.min(dragStart.col, dragCurrent.col),
      rowCount: Math.abs(dragCurrent.row - dragStart.row) + 1,
      colCount: Math.abs(dragCurrent.col - dragStart.col) + 1,
    };
  }, [isDragging, dragStart, dragCurrent]);

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
                  <Button size='small' color='warning' onClick={setSelectedAsAisle}>设为过道</Button>
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
};

// ====================== 弹窗内座位编辑器子组件 ======================
interface SeatLayoutEditorProps {
  seats: SeatItem[];
  onChange: (list: SeatItem[]) => void;
}
const SeatLayoutEditor: React.FC<SeatLayoutEditorProps> = ({ seats, onChange }) => {
  const currentSeats = seats || [];
  const rowCount = useMemo(() => currentSeats.length ? Math.max(...currentSeats.map(s => s.row)) : 0, [currentSeats]);
  const colCount = useMemo(() => currentSeats.length ? Math.max(...currentSeats.map(s => s.col)) : 0, [currentSeats]);
  const availableSeats = useMemo(() => countAvailableSeats(currentSeats), [currentSeats]);

  const toggleSeat = (r: number, c: number) => {
    const next = currentSeats.map(s => s.row === r && s.col === c ? { ...s, status: s.status === SEAT_STATUS.AISLE ? SEAT_STATUS.AVAILABLE : SEAT_STATUS.AISLE } : s);
    onChange(next);
  };
  const toggleRow = (r: number, setAisle: boolean) => {
    const next = currentSeats.map(s => s.row === r ? { ...s, status: setAisle ? SEAT_STATUS.AISLE : SEAT_STATUS.AVAILABLE } : s);
    onChange(next);
  };
  const toggleCol = (c: number, setAisle: boolean) => {
    const next = currentSeats.map(s => s.col === c ? { ...s, status: setAisle ? SEAT_STATUS.AISLE : SEAT_STATUS.AVAILABLE } : s);
    onChange(next);
  };
  const isRowAllAisle = (r: number) => currentSeats.filter(s => s.row === r).every(s => s.status === SEAT_STATUS.AISLE);
  const isColAllAisle = (c: number) => currentSeats.filter(s => s.col === c).every(s => s.status === SEAT_STATUS.AISLE);
  const clearAllAisles = () => onChange(currentSeats.map(s => ({ ...s, status: SEAT_STATUS.AVAILABLE })));
  const setMiddleColumnAisle = () => {
    const mid = Math.ceil(colCount / 2);
    const next = currentSeats.map(s => s.col === mid || s.col === mid + 1 ? { ...s, status: SEAT_STATUS.AISLE } : s);
    onChange(next);
  };
  const onAddRow = () => {
    const res = addRow(currentSeats);
    if (res.error) message.error(res.error);
    else onChange(res);
  };
  const onRemoveRow = () => {
    if (rowCount <= 1) return message.error('至少保留一行');
    const res = removeRow(currentSeats);
    if (res.error) message.error(res.error);
    else onChange(res);
  };
  const onAddCol = () => {
    const res = addCol(currentSeats);
    if (res.error) message.error(res.error);
    else onChange(res);
  };
  const onRemoveCol = () => {
    if (colCount <= 1) return message.error('至少保留一列');
    const res = removeCol(currentSeats);
    if (res.error) message.error(res.error);
    else onChange(res);
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
};

// ====================== 影厅表单组件 ======================
interface HallFormProps {
  data: HallFormValues;
  errors: HallFormErr;
  onChange: (vals: HallFormValues) => void;
}
const HallForm: React.FC<HallFormProps> = ({ data, errors, onChange }) => {
  const onField = (key: keyof HallFormValues, val: any) => onChange({ ...data, [key]: val });
  const totalSeats = useMemo(() => data.seats ? countAvailableSeats(data.seats) : 0, [data.seats]);
  useEffect(() => {
    if (!data.seats || data.seats.length === 0) onField('seats', generateSeats(8, 12));
  }, []);

  return (
    <Form layout='vertical' className={styles.hallForm}>
      <Form.Item label='影厅名称' required validateStatus={errors.name ? 'error' : ''} help={errors.name}>
        <Input value={data.name} onChange={e => onField('name', e.target.value)} placeholder='IMAX 1号厅' />
      </Form.Item>
      <Form.Item label='影厅类型' required validateStatus={errors.type ? 'error' : ''} help={errors.type}>
        <Space wrap>
          {HALL_TYPES.map(t => (
            <Button
              key={t.value}
              type={data.type === t.value ? 'primary' : 'default'}
              onClick={() => onField('type', t.value)}
            >{t.label}</Button>
          ))}
        </Space>
      </Form.Item>
      <Card size='small' styles={{ body: { padding: 12 } }}>
        <div className={styles.seatCountRow}>
          <Typography.Text className={styles.seatCountLabel}>预计可用座位</Typography.Text>
          <Space size={6}><TeamOutlined style={{ fontSize: 16, color: '#1677ff' }} /><Typography.Text strong className={styles.seatCountValue}>{totalSeats} 座</Typography.Text></Space>
        </div>
      </Card>
      <Form.Item label='座位布局编辑' validateStatus={errors.seats ? 'error' : ''} help={errors.seats}>
        <SeatLayoutEditor seats={data.seats} onChange={(list) => onField('seats', list)} />
      </Form.Item>
    </Form>
  );
};

// ====================== 主页面 Hall 影厅管理 ======================
const Hall: React.FC = () => {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cinemaIdParam = searchParams.get('cinemaId');
  const { cinemas } = useCinemaStore();
  const { halls, getHallsByCinemaId, addHall, updateHall, deleteHall } = useHallStore();
  const { schedules } = useScheduleStore();

  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemaIdParam || '');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [viewingHall, setViewingHall] = useState<HallItem | null>(null);
  const [editingHall, setEditingHall] = useState<HallItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<HallFormValues>({
    name: '',
    type: '',
    rowCount: 0,
    colCount: 0,
    totalSeats: 0,
    seats: [],
  });
  const [formErrors, setFormErrors] = useState<HallFormErr>({});

  useEffect(() => { if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam); }, [cinemaIdParam]);
  const currentCinema = useMemo(() => cinemas.find(c => String(c.id) === String(selectedCinemaId)), [cinemas, selectedCinemaId]);
  const filteredHalls = useMemo(() => {
    let list = selectedCinemaId ? getHallsByCinemaId(selectedCinemaId) : [...halls];
    if (keyword) list = list.filter(h => h.name.toLowerCase().includes(keyword.toLowerCase()));
    if (typeFilter) list = list.filter(h => h.type === typeFilter);
    return list;
  }, [halls, selectedCinemaId, keyword, typeFilter, getHallsByCinemaId]);

  // 表格列配置
  const tableColumns: TableProps<HallItem>['columns'] = [
    {
      title: '影厅名称',
      dataIndex: 'name',
      render: (name, row) => {
        const typeItem = HALL_TYPES.find(t => t.value === row.type);
        return (
          <Space size={12}>
            <div className={styles.hallIconBox} style={{ background: `${typeItem?.color || 'blue'}10` }}>
              <AppstoreOutlined style={{ fontSize: 20, color: `${typeItem?.color || '#1677ff'}` }} />
            </div>
            <div>
              <Typography.Text strong>{name}</Typography.Text>
              <div><Typography.Text type='secondary' className={styles.hallTypeLabel}>{typeItem?.label}</Typography.Text></div>
            </div>
          </Space>
        );
      },
    },
    { title: '座位布局', dataIndex: 'rowCount', align: 'center', render: (r, row) => `${r} × ${row.colCount}` },
    { title: '可用座位', dataIndex: 'totalSeats', align: 'center', render: v => <Space size={4}><TeamOutlined style={{ fontSize: 14 }} /><Typography.Text className={styles.availableSeatsText}>{v}</Typography.Text></Space> },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      render: val => {
        const cfg = HALL_STATUS_LABELS[val] || HALL_STATUS_LABELS.active;
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '操作',
      width: 160,
      align: 'center',
      render: (_v, row) => (
        <Space size={8}>
          <Button size='small' type='link' icon={<EyeOutlined style={{ fontSize: 14 }} />} onClick={() => setViewingHall(row) || setLayoutModalOpen(true)}>座位</Button>
          <Button size='small' icon={<EditOutlined style={{ fontSize: 14 }} />} onClick={() => openEdit(row)}>编辑</Button>
          <Button size='small' danger icon={<DeleteOutlined style={{ fontSize: 14 }} />} onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ];

  const handleSearch = () => setSelectedIds([]);
  const handleReset = () => { setKeyword(''); setTypeFilter(undefined); setSelectedIds([]); };
  const openAdd = () => {
    if (!selectedCinemaId) return message.error('请先选择影院');
    setEditingHall(null);
    setFormData({ name: '', type: '', rowCount: 0, colCount: 0, totalSeats: 0, seats: [] });
    setFormErrors({});
    setModalOpen(true);
  };
  const openEdit = (hall: HallItem) => {
    setEditingHall(hall);
    setFormData({ ...hall, seats: hall.seats || generateSeats(hall.rowCount, hall.colCount) });
    setFormErrors({});
    setModalOpen(true);
  };
  // 保存座位布局
  const saveLayout = async (data: { seats: SeatItem[]; totalSeats: number }) => {
    if (!viewingHall) return;
    const hasSchedule = schedules.some(s => String(s.hallId) === String(viewingHall.id) && s.status !== 'cancelled' && s.status !== 'ended');
    if (hasSchedule) return message.error('该影厅存在未结束排期，无法修改座位');
    updateHall(viewingHall.id, { seats: data.seats, totalSeats: data.totalSeats });
    setViewingHall(prev => prev ? { ...prev, ...data } : null);
    message.success('座位布局已更新');
  };
  // 表单校验
  const validateForm = () => {
    const err: HallFormErr = {};
    if (!formData.name?.trim()) err.name = '请输入影厅名称';
    if (!formData.type) err.type = '请选择影厅类型';
    if (!formData.seats || formData.seats.length === 0) err.seats = '请配置座位布局';
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };
  // 保存影厅
  const submitForm = async () => {
    if (!validateForm() || !selectedCinemaId) return;
    setSubmitting(true);
    try {
      const rowCnt = formData.seats.length ? Math.max(...formData.seats.map(s => s.row)) : 0;
      const colCnt = formData.seats.length ? Math.max(...formData.seats.map(s => s.col)) : 0;
      const savePayload = { ...formData, rowCount: rowCnt, colCount: colCnt };
      if (editingHall) {
        const hasSchedule = schedules.some(s => String(s.hallId) === String(editingHall.id) && s.status !== 'cancelled' && s.status !== 'ended');
        if (hasSchedule && (rowCnt !== editingHall.rowCount || colCnt !== editingHall.colCount)) {
          return message.error('存在活跃排期，不可修改行列数量');
        }
        await updateHall(editingHall.id, savePayload);
        message.success('影厅更新成功');
      } else {
        await addHall({ ...savePayload, cinemaId: selectedCinemaId });
        message.success('新增影厅成功');
      }
      setModalOpen(false);
    } catch (e: any) {
      message.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };
  // 删除影厅
  const handleDelete = (hall: HallItem) => {
    const hasSchedule = schedules.some(s => String(s.hallId) === String(hall.id) && s.status !== 'cancelled' && s.status !== 'ended');
    if (hasSchedule) return message.error('该影厅有排期，无法删除');
    Modal.confirm({ title: '删除确认', content: `确定删除【${hall.name}】？删除不可恢复`, okText: '确认删除', okDanger: true, onOk: () => { deleteHall(hall.id); message.success('删除成功'); setSelectedIds(prev => prev.filter(id => id !== hall.id)); } });
  };
  const backCinema = () => { setSelectedCinemaId(''); navigate('/halls'); };

  return (
    <div className={styles.pageWrap}>
      {/* 页面头部 */}
      <div className={styles.headerWrap}>
        <div>
          {selectedCinemaId && (
            <Button type='link' size='small' icon={<ArrowLeftOutlined style={{ fontSize: 16 }} />} onClick={backCinema} className={styles.backButton}>返回影院列表</Button>
          )}
          <Typography.Title level={3} className={styles.pageTitle}>
            {currentCinema ? `${currentCinema.name} - 影厅管理` : '影厅管理'}
          </Typography.Title>
          <Typography.Text type='secondary'>
            {currentCinema ? '管理该影院所有影厅座位布局' : '请先选择影院查看对应影厅'}
          </Typography.Text>
        </div>
        {selectedCinemaId && <Button type='primary' icon={<PlusOutlined style={{ fontSize: 16 }} />} onClick={openAdd}>新增影厅</Button>}
      </div>

      {/* 未选影院 - 选择卡片 */}
      {!selectedCinemaId && (
        <div className={styles.selectCinemaBox}>
          <div className={styles.selectCinemaIcon}>
            <EnvironmentOutlined style={{ fontSize: 32, color: '#1677ff' }} />
          </div>
          <Typography.Title level={5} className={styles.selectCinemaTitle}>请选择影院</Typography.Title>
          <Typography.Text type='secondary' className={styles.selectCinemaHint}>选择对应影院后管理影厅</Typography.Text>
          <div className={styles.cinemaGrid}>
            {cinemas.map(c => (
              <Card hoverable key={c.id} onClick={() => { setSelectedCinemaId(c.id); navigate(`/halls?cinemaId=${c.id}`); }} styles={{ body: { padding: 16 } }}>
                <Typography.Text strong>{c.name}</Typography.Text>
                <div className={styles.cinemaCardAddress}>{c.address}</div>
                <div className={styles.cinemaCardHalls}>
                  <TeamOutlined style={{ fontSize: 12 }} className={styles.cinemaCardHallIcon} /> {c.hallCount} 个影厅
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 已选影院：筛选+表格 */}
      {selectedCinemaId && (
        <>
          <div className={styles.filterBox}>
            <Space size={12}>
              <Input placeholder='搜索影厅名称' value={keyword} onChange={e => setKeyword(e.target.value)} className={styles.searchInput} prefix={<SearchOutlined style={{ fontSize: 14, color: '#999' }} />} allowClear />
              <Select placeholder='全部类型' allowClear value={typeFilter} onChange={v => setTypeFilter(v)} className={styles.typeSelect}>
                {HALL_TYPES.map(t => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}
              </Select>
              <Button type='primary' onClick={handleSearch}>搜索</Button>
              {(keyword || typeFilter) && <Button onClick={handleReset}>重置</Button>}
            </Space>
          </div>
          <Card styles={{ body: { padding: 0 } }}>
            <Table<HallItem>
              rowKey='id'
              columns={tableColumns}
              dataSource={filteredHalls}
              pagination={{ pageSize: 10 }}
              bordered
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </>
      )}

      {/* 新增/编辑影厅弹窗 */}
      <Modal
        title={editingHall ? '编辑影厅' : '新增影厅'}
        open={modalOpen}
        maskClosable={false}
        width={580}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        onOk={submitForm}
      >
        <HallForm data={formData} errors={formErrors} onChange={setFormData} />
      </Modal>

      {/* 座位布局全屏弹窗 */}
      {layoutModalOpen && viewingHall && (
        <Modal
          open={layoutModalOpen}
          footer={null}
          width='90%'
          className={styles.layoutModal}
          height='85vh'
          maskClosable={false}
          onCancel={() => setLayoutModalOpen(false)}
          title={`${viewingHall.name} - 座位布局`}
        >
          <SeatLayoutViewer
            rowCount={viewingHall.rowCount}
            colCount={viewingHall.colCount}
            seats={viewingHall.seats}
            hallId={viewingHall.id}
            onSave={saveLayout}
            onCancel={() => setLayoutModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default Hall;
