import { useState, useMemo, useEffect, useRef } from "react";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  StopOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { Modal, Button, Space, Tag, Card } from "antd";
import { message, modal } from "@/shared/utils/globalMessage";
import { ProTable } from "@ant-design/pro-components";
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCinemaStore } from "../cinema";
import { useMovieStore } from "../movie";
import { useHallStore } from "../hall";
import {
  useScheduleStore,
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
} from "./store";
import type { ScheduleItem } from "./types";
import { ScheduleForm } from "./ScheduleForm";
import type { ScheduleFormData, ScheduleFormErr } from "./ScheduleForm";
import styles from "./SchedulePage.module.css";

// ===================== 主页面 Schedule排期管理 =====================
export function SchedulePage() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [searchParams] = useSearchParams();
  const cinemaStore = useCinemaStore();
  const movieStore = useMovieStore();
  const hallStore = useHallStore();
  const scheduleStore = useScheduleStore();
  const { fetchSchedules } = scheduleStore;
  const { fetchCinemas } = cinemaStore;
  const { fetchMovies } = movieStore;
  const { fetchHalls } = hallStore;

  // URL影院参数
  const cinemaIdParam = searchParams.get("cinemaId");
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(
    cinemaIdParam ?? "",
  );

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduleItem | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    cinemaId: "",
    hallId: "",
    movieId: "",
    showDate: "",
    showTime: "",
    endTime: "",
    price: 0,
    languageVersion: "国语 2D",
  });
  const [formErrors, setFormErrors] = useState<ScheduleFormErr>({});

  // 同步URL影院参数
  useEffect(() => {
    if (cinemaIdParam) setSelectedCinemaId(cinemaIdParam);
  }, [cinemaIdParam]);

  // 初始加载：排期 + 影院 + 影片
  useEffect(() => {
    void fetchSchedules();
    void fetchCinemas({ page: 1, size: 100 });
    void fetchMovies({ page: 1, size: 100 });
  }, [fetchSchedules, fetchCinemas, fetchMovies]);

  // 选中影院时加载该影院的影厅
  useEffect(() => {
    if (selectedCinemaId) void fetchHalls({ cinemaId: selectedCinemaId });
  }, [selectedCinemaId, fetchHalls]);

  // 数据缓存
  const cinemas = cinemaStore.cinemas;
  const movies = movieStore.movies;
  const allHalls = hallStore.halls;
  const currentCinema = useMemo(
    () => cinemas.find((c) => String(c.id) === String(selectedCinemaId)),
    [cinemas, selectedCinemaId],
  );

  // 计算上座率
  const calcRate = (sold: number, total: number) =>
    total === 0 ? 0 : Math.round((sold / total) * 100);

  // 打开新增弹窗
  const openAdd = () => {
    if (!selectedCinemaId) return message.warning("请先选择影院");
    setEditSchedule(null);
    setFormData({
      cinemaId: selectedCinemaId,
      hallId: "",
      movieId: "",
      showDate: dayjs().format("YYYY-MM-DD"),
      showTime: "",
      endTime: "",
      price: 0,
      languageVersion: "国语 2D",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // 打开编辑弹窗
  const openEdit = (row: ScheduleItem) => {
    setEditSchedule(row);
    setFormData({
      cinemaId: row.cinemaId,
      hallId: row.hallId,
      movieId: row.movieId,
      showDate: row.showDate,
      showTime: row.showTime,
      endTime: row.endTime,
      price: row.price,
      languageVersion: row.languageVersion,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // 返回影院选择页
  const backCinema = () => {
    setSelectedCinemaId("");
    navigate("/schedules");
  };

  // 表单校验
  const validateForm = () => {
    const err: ScheduleFormErr = {};
    if (!formData.hallId) err.hallId = "请选择影厅";
    if (!formData.movieId) err.movieId = "请选择影片";
    if (!formData.showDate) err.showDate = "请选择放映日期";
    if (!formData.showTime) err.showTime = "请选择放映时间";
    if (!formData.price || formData.price <= 0) err.price = "票价必须大于0";
    if (!formData.languageVersion) err.languageVersion = "请选择语言版本";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  // 排期冲突检测
  const checkConflict = (data: ScheduleFormData, excludeId?: string) => {
    const targetMovie = movies.find((m) => m.id === data.movieId);
    const start = dayjs(`${data.showDate} ${data.showTime}`);
    const end = start.add(targetMovie?.duration || 120, "minute");
    const targetHalls = scheduleStore.schedules.filter(
      (s) =>
        s.hallId === data.hallId &&
        s.id !== excludeId &&
        s.status !== SCHEDULE_STATUS.CANCELLED,
    );
    for (const item of targetHalls) {
      const itemStart = dayjs(`${item.showDate} ${item.showTime}`);
      const itemEnd = itemStart.add(
        movies.find((m) => m.id === item.movieId)?.duration || 120,
        "minute",
      );
      if (start.isBefore(itemEnd) && end.isAfter(itemStart)) {
        return { conflict: true, target: item };
      }
    }
    return { conflict: false };
  };

  // 保存排期
  const submitForm = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const { conflict, target } = checkConflict(formData, editSchedule?.id);
      if (conflict && target) {
        message.error(
          `排期冲突：${target.movieName} ${target.showTime}-${target.endTime}`,
        );
        setSubmitting(false);
        return;
      }
      if (editSchedule) {
        await scheduleStore.updateSchedule(editSchedule.id, {
          hallId: formData.hallId,
          showDate: formData.showDate,
          startTime: formData.showTime,
          endTime: formData.endTime,
          price: formData.price,
          languageVersion: formData.languageVersion,
        });
        message.success("排期更新成功");
      } else {
        await scheduleStore.addSchedule({
          movieId: formData.movieId,
          cinemaId: formData.cinemaId,
          hallId: formData.hallId,
          showDate: formData.showDate,
          startTime: formData.showTime,
          price: formData.price,
          languageVersion: formData.languageVersion,
        });
        message.success("新增排期成功");
      }
      setModalOpen(false);
      actionRef.current?.reload();
    } catch (e: any) {
      message.error(e.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 取消场次
  const handleCancelSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return message.error("该场次存在订单，不可取消");
    modal.confirm({
      title: "确认取消排期",
      content: `确定取消【${row.movieName} ${row.showDate}】？`,
      okText: "确认取消",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await scheduleStore.cancelSchedule(row.id);
          message.success("场次已取消");
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || "操作失败");
        }
      },
    });
  };

  // 恢复场次
  const handleRestoreSchedule = (row: ScheduleItem) => {
    modal.confirm({
      title: "确认恢复排期",
      content: `确定恢复【${row.movieName} ${row.showDate}】为在售状态？`,
      okText: "确认恢复",
      cancelText: "取消",
      onOk: async () => {
        try {
          await scheduleStore.restoreSchedule(row.id);
          message.success("场次已恢复");
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || "操作失败");
        }
      },
    });
  };

  // 删除场次
  const handleDeleteSchedule = (row: ScheduleItem) => {
    if (row.soldSeats > 0) return message.error("该场次存在订单，无法删除");
    modal.confirm({
      title: "删除确认",
      content: `删除【${row.movieName}】后无法恢复`,
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await scheduleStore.deleteSchedule(row.id);
          message.success("删除成功");
          actionRef.current?.reload();
        } catch (e: any) {
          message.error(e.message || "操作失败");
        }
      },
    });
  };

  // 表格列配置
  const columns: ProColumns<ScheduleItem>[] = [
    {
      title: "影片",
      dataIndex: "movieId",
      valueType: "select",
      fieldProps: {
        showSearch: true,
        allowClear: true,
        placeholder: "请选择影片",
      },
      valueEnum: Object.fromEntries(
        movies.map((m) => [String(m.id), { text: m.name }]),
      ),
      render: (_, record) => (
        <div>
          <div className={styles.cellMovieName}>{record.movieName}</div>
          <div className={styles.cellSubText}>{record.languageVersion}</div>
        </div>
      ),
    },
    {
      title: "放映时间",
      dataIndex: "showDate",
      search: false,
      render: (_, record) => (
        <div className={styles.cellShowTime}>
          <div className={styles.cellDateRow}>
            <CalendarOutlined style={{ fontSize: 14, color: "#999" }} />
            {record.showDate}
          </div>
          <div className={styles.cellTimeRow}>
            <ClockCircleOutlined style={{ fontSize: 14 }} />
            {record.showTime} - {record.endTime}
          </div>
        </div>
      ),
    },
    {
      title: "影厅",
      dataIndex: "hallId",
      valueType: "select",
      fieldProps: {
        showSearch: true,
        allowClear: true,
        placeholder: "请选择影厅",
      },
      valueEnum: Object.fromEntries(
        allHalls.map((h) => [String(h.id), { text: h.name }]),
      ),
      render: (_, record) => (
        <div>
          <div className={styles.cellMovieName}>{record.hallName}</div>
          <div className={styles.cellSubText}>{record.cinemaName}</div>
        </div>
      ),
    },
    {
      title: "票价",
      dataIndex: "price",
      align: "center",
      search: false,
      render: (_, record) => (
        <div className={styles.cellCenter}>
          <div className={styles.cellPriceValue}>¥{record.price}</div>
        </div>
      ),
    },
    {
      title: "座位",
      align: "center",
      dataIndex: "soldSeats",
      search: false,
      render: (_, record) => {
        const rate = calcRate(record.soldSeats, record.totalSeats);
        const barClass =
          rate >= 80
            ? styles.barRed
            : rate >= 50
              ? styles.barAmber
              : styles.barGreen;
        const textClass =
          rate >= 80
            ? styles.textRed
            : rate >= 50
              ? styles.textAmber
              : styles.textGreen;
        return (
          <div className={styles.cellCenter}>
            <Space size={4} className={styles.cellCenterSpace}>
              <AppstoreOutlined style={{ fontSize: 14, color: "#999" }} />
              <span>
                {record.soldSeats}/{record.totalSeats}
              </span>
            </Space>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${barClass}`}
                style={{ width: `${rate}%` }}
              />
            </div>
            <span className={`${styles.rateText} ${textClass}`}>{rate}%</span>
          </div>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      align: "center",
      valueType: "select",
      valueEnum: {
        available: { text: "可售" },
        full: { text: "满场" },
        ended: { text: "已结束" },
        cancelled: { text: "已取消" },
      },
      render: (_, record) => {
        const cfg = SCHEDULE_STATUS_LABELS[record.status];
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: "操作",
      width: 160,
      align: "center",
      search: false,
      render: (_, record) => {
        const hasSold = record.soldSeats > 0;
        const isEnd = record.status === SCHEDULE_STATUS.ENDED;
        const isCancel = record.status === SCHEDULE_STATUS.CANCELLED;
        return (
          <Space size={6}>
            {!isEnd && !isCancel && (
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={hasSold}
                onClick={() => openEdit(record)}
              >
                编辑
              </Button>
            )}
            {!isEnd && !isCancel && (
              <Button
                size="small"
                danger
                ghost
                icon={<StopOutlined />}
                disabled={hasSold}
                onClick={() => handleCancelSchedule(record)}
              >
                取消
              </Button>
            )}
            {isCancel && (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<UndoOutlined />}
                onClick={() => handleRestoreSchedule(record)}
              >
                恢复
              </Button>
            )}
            {(isEnd || isCancel) && (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={hasSold}
                onClick={() => handleDeleteSchedule(record)}
              >
                删除
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className={styles.pageRoot}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <div>
          {selectedCinemaId && (
            <Button
              type="link"
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={backCinema}
              className={styles.backButton}
            >
              返回影院列表
            </Button>
          )}
          <h2 className={styles.pageTitle}>
            {currentCinema ? `${currentCinema.name} - 排期管理` : "场次管理"}
          </h2>
          <p className={styles.pageSubtitle}>
            {currentCinema ? "管理本影院放映排片" : "请先选择影院查看排期"}
          </p>
        </div>
        {selectedCinemaId && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增排期
          </Button>
        )}
      </div>

      {/* 未选影院：影院选择卡片 */}
      {!selectedCinemaId && (
        <div className={styles.cinemaSelectPanel}>
          <div className={styles.cinemaIconCircle}>
            <EnvironmentOutlined style={{ fontSize: 32, color: "#1677ff" }} />
          </div>
          <h3 className={styles.cinemaSelectTitle}>请选择影院</h3>
          <p className={styles.cinemaSelectDesc}>
            选择影院后查看、新增放映排期
          </p>
          <div className={styles.cinemaGrid}>
            {cinemas.map((cinema) => (
              <Card
                hoverable
                key={cinema.id}
                onClick={() => {
                  setSelectedCinemaId(cinema.id);
                  navigate(`/schedules?cinemaId=${cinema.id}`);
                }}
              >
                <div className={styles.cardCinemaName}>{cinema.name}</div>
                <div className={styles.cardCinemaAddress}>{cinema.address}</div>
                <div className={styles.cardHallCount}>
                  <AppstoreOutlined style={{ fontSize: 12 }} /> {cinema.hallCount} 个影厅
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 已选影院：ProTable */}
      {selectedCinemaId && (
        <ProTable<ScheduleItem>
          actionRef={actionRef}
          rowKey="id"
          columns={columns}
          request={async (params) => {
            await fetchSchedules({
              cinemaId: selectedCinemaId,
              movieId: params.movieId || undefined,
              hallId: params.hallId || undefined,
              status: params.status === "available" ? "onsale" : params.status,
              page: params.current ?? 1,
              size: params.pageSize ?? 10,
            });
            const state = useScheduleStore.getState();
            return {
              data: state.schedules,
              success: true,
              total: state.total,
            };
          }}
          search={{ labelWidth: "auto", span: 6, defaultCollapsed: false }}
          pagination={{
            defaultPageSize: 10,
            pageSizeOptions: [10, 20, 50],
            showSizeChanger: true,
          }}
          bordered
          scroll={{ x: "max-content" }}
          headerTitle={`${currentCinema?.name ?? ""} 排期列表`}
        />
      )}

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modalOpen}
        title={editSchedule ? "编辑排期" : "新增排期"}
        width={580}
        maskClosable={false}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        onCancel={() => setModalOpen(false)}
        onOk={submitForm}
      >
        <ScheduleForm
          data={formData}
          errors={formErrors}
          onChange={setFormData}
          halls={allHalls}
          movies={movies}
        />
      </Modal>
    </div>
  );
}
