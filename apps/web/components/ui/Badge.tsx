import styles from './Badge.module.css';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface Props {
  children: React.ReactNode;
  variant?: Variant;
}

export function Badge({ children, variant = 'default' }: Props) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
}
