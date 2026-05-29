'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  value: number | null
}

interface MiniLineChartProps {
  data: DataPoint[]
  color?: string
}

export default function MiniLineChart({ data, color = '#2e6da4' }: MiniLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#999' }}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v) => [`${v} mg/dL`, '혈당']}
          labelFormatter={(l) => l}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
