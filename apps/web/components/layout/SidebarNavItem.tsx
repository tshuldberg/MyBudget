'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import styles from './SidebarNavItem.module.css';

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function SidebarNavItem({ href, label, icon: Icon, onClick }: Props) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <Icon size={18} />
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
