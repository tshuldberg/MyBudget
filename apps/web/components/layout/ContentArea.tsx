import styles from './ContentArea.module.css';

interface Props {
  children: React.ReactNode;
}

export function ContentArea({ children }: Props) {
  return <main className={styles.content}>{children}</main>;
}
