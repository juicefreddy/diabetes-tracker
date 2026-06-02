'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, LabelList,
} from 'recharts'

export interface DayGlucosePoint {
  date: string
  fasting: number | null
  maxPost: number | null
  spike: number | null
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DayGlucosePoint }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-2.5 text-xs shadow-md min-w-[120px]">
      <p className="font-semibold text-gray-600 mb-1">{d.date}</p>
      {d.fasting != null && (
        <p className="text-[#2e6da4]">공복: <span className="font-bold">{d.fasting}</span> mg/dL</p>
      )}
      {d.maxPost != null && (
        <p className="text-orange-500">식후최고: <span className="font-bold">{d.maxPost}</span> mg/dL</p>
      )}
      {d.spike != null && d.spike > 0 && (
        <p className="text-red-500 font-semibold mt-0.5">상승폭: +{d.spike} mg/dL</p>
      )}
    </div>
  )
}

export default function DashboardGlucoseChart({ data }: { data: DayGlucosePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 18, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }}
          tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#999' }} domain={[60, 'auto']} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={99} stroke="#22c55e" strokeDasharray="4 4"
          label={{ value: '99', fontSize: 9, fill: '#22c55e', position: 'insideTopRight' }} />
        <ReferenceLine y={140} stroke="#f97316" strokeDasharray="4 4"
          label={{ value: '140', fontSize: 9, fill: '#f97316', position: 'insideTopRight' }} />

        {/* 식후 최고 — 얇은 주황 선 */}
        <Line type="monotone" dataKey="maxPost" stroke="#f97316" strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={{ r: 3, fill: '#f97316', stroke: '#f97316' }} connectNulls>
          <LabelList dataKey="spike" position="top"
            formatter={(v: unknown) => (typeof v === 'number' && v > 0 ? `+${v}` : '')}
            style={{ fontSize: 8, fill: '#f97316', fontWeight: 600 }} />
        </Line>

        {/* 공복 — 두꺼운 파란 선 (위에 렌더링) */}
        <Line type="monotone" dataKey="fasting" stroke="#2e6da4" strokeWidth={2.5}
          dot={{ r: 5, fill: '#2e6da4', stroke: 'white', strokeWidth: 2 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
