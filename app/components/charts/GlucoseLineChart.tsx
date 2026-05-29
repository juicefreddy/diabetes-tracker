'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  value: number | null
}

interface GlucoseLineChartProps {
  data: DataPoint[]
  type: 'fasting' | 'postprandial'
}

export default function GlucoseLineChart({ data, type }: GlucoseLineChartProps) {
  const normalMax = type === 'fasting' ? 99 : 140
  const cautionMax = type === 'fasting' ? 125 : 199

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#999' }}
          tickFormatter={(v) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} domain={[60, 'auto']} />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          formatter={(v) => [`${v} mg/dL`, '혈당']}
        />
        <ReferenceLine y={normalMax} stroke="#27ae60" strokeDasharray="4 4" label={{ value: `정상 ${normalMax}`, fontSize: 10, fill: '#27ae60' }} />
        <ReferenceLine y={cautionMax} stroke="#f39c12" strokeDasharray="4 4" label={{ value: `주의 ${cautionMax}`, fontSize: 10, fill: '#f39c12' }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#2e6da4"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2e6da4' }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
