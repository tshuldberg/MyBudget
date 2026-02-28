'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, axisStyle, gridStyle, tooltipStyle } from '../../lib/chart-theme';

interface Props {
  data: Array<{ month: string; total: number }>;
}

function formatMonth(month: string): string {
  const [, m] = month.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[parseInt(m, 10) - 1] ?? month;
}

export function MonthlySpendingChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: formatMonth(d.month),
    spending: d.total / 100,
  }));

  if (chartData.every((d) => d.spending === 0)) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '48px 0', fontSize: 14 }}>
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.teal} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColors.teal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis dataKey="name" {...axisStyle} />
        <YAxis {...axisStyle} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Spending']}
        />
        <Area
          type="monotone"
          dataKey="spending"
          stroke={chartColors.teal}
          strokeWidth={2}
          fill="url(#spendingGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
