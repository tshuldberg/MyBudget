'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CHART_PALETTE, tooltipStyle, chartColors } from '../../lib/chart-theme';
import styles from './SpendingBreakdown.module.css';

interface Props {
  data: Array<{ categoryName: string; emoji: string | null; total: number }>;
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  categoryName: string;
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, categoryName }: LabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill={chartColors.textPrimary}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontFamily="Inter, sans-serif"
    >
      {categoryName} {(percent * 100).toFixed(0)}%
    </text>
  );
}

export function SpendingBreakdown({ data }: Props) {
  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return <div className={styles.emptyText}>No spending data for this month</div>;
  }

  const chartData = data.map((d) => ({
    name: d.emoji ? `${d.emoji} ${d.categoryName}` : d.categoryName,
    categoryName: d.categoryName,
    value: d.total / 100,
    rawCents: d.total,
  }));

  return (
    <div className={styles.container}>
      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number) => [formatCurrency(value * 100), 'Spent']}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: 12,
                color: chartColors.textSecondary,
                paddingTop: 16,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
