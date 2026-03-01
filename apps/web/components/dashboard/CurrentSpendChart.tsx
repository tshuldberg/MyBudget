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

interface DailyPoint {
  day: number;
  cumulative: number;
}

interface Props {
  thisMonth: DailyPoint[];
  lastMonth: DailyPoint[];
}

function formatOrdinal(day: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = day % 100;
  return `${day}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(2)}k`;
  }
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CurrentSpendChart({ thisMonth, lastMonth }: Props) {
  // Merge into single dataset by day
  const maxDays = Math.max(thisMonth.length, lastMonth.length);
  const chartData = [];
  for (let i = 0; i < maxDays; i++) {
    chartData.push({
      day: i + 1,
      name: formatOrdinal(i + 1),
      thisMonth: thisMonth[i]?.cumulative ?? null,
      lastMonth: lastMonth[i]?.cumulative ?? null,
    });
  }

  // Only show up to today for this month
  const today = new Date().getDate();

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="thisMonthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.teal} stopOpacity={0.15} />
            <stop offset="100%" stopColor={chartColors.teal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridStyle} />
        <XAxis
          dataKey="name"
          {...axisStyle}
          interval="preserveStartEnd"
          tickFormatter={(v, i) => {
            // Show 1st, 8th, 15th, 21st, 28th
            const day = i + 1;
            if ([1, 8, 15, 21, 28].includes(day)) return formatOrdinal(day);
            return '';
          }}
        />
        <YAxis
          {...axisStyle}
          tickFormatter={(v) => formatCurrency(v)}
          width={60}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: string | number, name: string) => {
            const num = typeof value === 'number' ? value : Number(value);
            const label = name === 'thisMonth' ? 'This Month' : 'Last Month';
            return [formatCurrency(num), label];
          }}
          labelFormatter={(label) => label}
        />
        {/* Last month: dashed, muted */}
        <Area
          type="monotone"
          dataKey="lastMonth"
          stroke={chartColors.textMuted}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="none"
          dot={false}
          connectNulls={false}
        />
        {/* This month: solid, teal */}
        <Area
          type="monotone"
          dataKey="thisMonth"
          stroke={chartColors.teal}
          strokeWidth={2.5}
          fill="url(#thisMonthGrad)"
          dot={(props: { cx: number; cy: number; index: number }) => {
            // Show dot only on today
            if (props.index === today - 1) {
              return (
                <circle
                  key="today-dot"
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={chartColors.teal}
                  stroke={chartColors.background}
                  strokeWidth={2}
                />
              );
            }
            return <circle key={`dot-${props.index}`} r={0} cx={0} cy={0} />;
          }}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
