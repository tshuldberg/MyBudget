'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { chartColors, axisStyle, gridStyle, tooltipStyle } from '../../lib/chart-theme';
import styles from './MonthlyTrendChart.module.css';

interface Props {
  data: Array<{ month: string; income: number; expense: number }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(month: string): string {
  const [, m] = month.split('-');
  return MONTHS[parseInt(m, 10) - 1] ?? month;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function MonthlyTrendChart({ data }: Props) {
  if (data.length === 0 || data.every((d) => d.income === 0 && d.expense === 0)) {
    return <div className={styles.emptyText}>No income or expense data yet</div>;
  }

  const chartData = data.map((d) => ({
    name: formatMonth(d.month),
    income: d.income / 100,
    expense: d.expense / 100,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.teal} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartColors.teal} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColors.coral} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartColors.coral} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="name" {...axisStyle} />
            <YAxis {...axisStyle} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'income' ? 'Income' : 'Expenses',
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: 12,
                color: chartColors.textSecondary,
                paddingTop: 8,
              }}
              formatter={(value: string) => (value === 'income' ? 'Income' : 'Expenses')}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={chartColors.teal}
              strokeWidth={2}
              fill="url(#incomeGradient)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke={chartColors.coral}
              strokeWidth={2}
              fill="url(#expenseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
