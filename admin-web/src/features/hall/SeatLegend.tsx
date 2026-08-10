import styles from './HallPage.module.css';

/**
 * 座位图例组件
 * 在座位布局编辑器/查看器底部展示座位状态颜色说明
 * 包含：可用、已售、过道、选中
 */
export function SeatLegend() {
  return (
    <div className={styles.legendWrap}>
      {/* 可用座位 */}
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockAvailable}`} />
        <span>可用</span>
      </div>
      {/* 已售座位 */}
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockSold}`} />
        <span>已售</span>
      </div>
      {/* 过道（不可售） */}
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockAisle}`} />
        <span>过道</span>
      </div>
      {/* 选中状态 */}
      <div className={styles.legendItem}>
        <div className={`${styles.legendBlock} ${styles.legendBlockSelected}`} />
        <span>选中</span>
      </div>
    </div>
  );
}
