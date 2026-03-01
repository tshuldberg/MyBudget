import styles from './ProgressBar.module.css';

interface Props {
  value: number; // 0-100
  max?: number;
  color?: 'teal' | 'amber' | 'coral' | 'auto';
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, max = 100, color = 'auto', size = 'md' }: Props) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = color === 'auto'
    ? pct >= 100 ? 'coral' : pct >= 80 ? 'amber' : 'teal'
    : color;

  return (
    <div className={`${styles.track} ${styles[size]}`}>
      <div
        className={`${styles.fill} ${styles[barColor]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
