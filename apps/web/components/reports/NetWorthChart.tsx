'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartColors, axisStyle, gridStyle, tooltipStyle } from '../../lib/chart-theme';
import styles from './NetWorthChart.module.css';

interface Props {
  data: Array<{ month: string; netWorth: number }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(month: string): string {
  const [, m] = month.split('-');
  return MONTHS[parseInt(m, 10) - 1] ?? month;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function NetWorthChart({ data }: Props) {
  if (data.length === 0) {
    return <div className={styles.emptyText}>No net worth data yet</div>;
  }

  const chartData = data.map((d) => ({
    name: formatMonth(d.month),
    netWorth: d.netWorth / 100,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.teal} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartColors.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="name" {...axisStyle} />
            <YAxis {...axisStyle} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke={chartColors.teal}
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
