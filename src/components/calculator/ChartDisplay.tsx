'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { cn } from '@/lib/utils/cn'
import { ChartDataPoint } from '@/types'
import { formatCurrency } from '@/lib/utils/formatters'

interface ChartDisplayProps {
  data: ChartDataPoint[]
  type?: 'pie' | 'donut'
  className?: string
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function ChartDisplay({ data, type = 'donut', className }: ChartDisplayProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className={cn('w-full h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={type === 'donut' ? 60 : 0}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="label"
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => {
              const item = data.find((d) => d.label === value)
              if (!item) return value
              const percent = ((item.value / total) * 100).toFixed(1)
              return `${value} (${percent}%)`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Simple legend-only view for mobile
export function ChartLegend({ data }: { data: ChartDataPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percent = ((item.value / total) * 100).toFixed(1)
        return (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {item.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.value)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                ({percent}%)
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
