'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

interface DataPoint { date: string; value: number | null }

export default function WeightLineChart({ data, height_cm }: { data: DataPoint[]; height_cm?: number }) {
  const h = height_cm ? height_cm / 100 : null
  const bmi23 = h ? Math.round(23 * h * h * 10) / 10 : null
  const bmi25 = h ? Math.round(25 * h * h * 10) / 10 : null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }}
          tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} domain={['auto', 'auto']} unit="kg" width={42} />
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [`${v} kg`, '몸무게']} />
        {bmi23 && (
          <ReferenceLine y={bmi23} stroke="#27ae60" strokeDasharray="4 4"
            label={{ value: `BMI 23 (${bmi23}kg)`, fontSize: 9, fill: '#27ae60', position: 'insideTopRight' }} />
        )}
        {bmi25 && (
          <ReferenceLine y={bmi25} stroke="#f39c12" strokeDasharray="4 4"
            label={{ value: `BMI 25 (${bmi25}kg)`, fontSize: 9, fill: '#f39c12', position: 'insideTopRight' }} />
        )}
        <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2}
          dot={{ r: 3, fill: '#0d9488' }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
