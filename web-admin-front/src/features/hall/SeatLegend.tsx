import styles from './HallPage.module.css';

export function SeatLegend() {
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
}
