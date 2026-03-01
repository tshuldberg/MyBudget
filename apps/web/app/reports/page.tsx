import Link from 'next/link';
import { PieChart, TrendingUp, Landmark, TrendingDown, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import styles from './page.module.css';

const REPORT_CARDS = [
  {
    title: 'Spending Breakdown',
    description: 'See where your money goes with a category-by-category breakdown of this month\'s spending.',
    href: '/reports/spending',
    icon: PieChart,
    color: 'rgba(78, 205, 196, 0.1)',
    iconColor: 'var(--color-teal)',
  },
  {
    title: 'Income vs Expense',
    description: 'Track your income and expenses over the last 6 months to spot trends.',
    href: '/reports/income-vs-expense',
    icon: TrendingUp,
    color: 'rgba(245, 166, 35, 0.1)',
    iconColor: 'var(--color-amber)',
  },
  {
    title: 'Net Worth',
    description: 'Monitor your net worth over time across all your accounts.',
    href: '/reports/net-worth',
    icon: Landmark,
    color: 'rgba(160, 160, 200, 0.1)',
    iconColor: 'var(--color-lavender)',
  },
  {
    title: 'Debt Payoff',
    description: 'Plan your debt repayment with snowball or avalanche strategies.',
    href: '/debt-payoff',
    icon: TrendingDown,
    color: 'rgba(255, 107, 107, 0.1)',
    iconColor: 'var(--color-coral)',
  },
  {
    title: 'Upcoming',
    description: 'See scheduled transactions for the next 30 days.',
    href: '/upcoming',
    icon: Calendar,
    color: 'rgba(245, 166, 35, 0.1)',
    iconColor: 'var(--color-amber)',
  },
] as const;

export default function ReportsPage() {
  return (
    <div className="fade-in">
      <PageHeader title="Reports" subtitle="Visualize your finances" />

      <div className={styles.grid}>
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className={styles.cardLink}>
              <Card elevated>
                <div className={styles.cardContent}>
                  <div
                    className={styles.iconWrap}
                    style={{ background: card.color, color: card.iconColor }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className={styles.cardTitle}>{card.title}</div>
                    <p className={styles.cardDesc}>{card.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
