import styles from './Card.module.css';

interface Props {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, elevated, onClick }: Props) {
  return (
    <div
      className={`${styles.card} ${elevated ? styles.elevated : ''} ${className ?? ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
