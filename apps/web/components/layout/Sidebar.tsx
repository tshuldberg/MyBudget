'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  RefreshCw,
  BarChart3,
  Building2,
  Settings,
  Menu,
  X,
  Landmark,
  Target,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import { SidebarNavItem } from './SidebarNavItem';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/upcoming', label: 'Upcoming', icon: Calendar },
  { href: '/debt-payoff', label: 'Debt Payoff', icon: TrendingDown },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
];

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <Wallet size={24} />
          <span className={styles.logoText}>MyBudget</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>

          <div className={styles.spacer} />

          <div className={styles.navGroup}>
            <a href="/accounts/connect" className={styles.connectBtn}>
              <Landmark size={16} />
              <span>Connect Bank</span>
            </a>

            {BOTTOM_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
