import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatBytes } from '../../utils/formatters';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-lg text-xs font-sans border border-slate-700">
        <div className="font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          {data.category}
        </div>
        <div className="mt-1 text-slate-300">
          Size: <span className="font-mono font-medium text-white">{formatBytes(data.total_bytes)}</span>
        </div>
        <div className="text-slate-400">
          Files: <span className="font-medium text-slate-200">{data.file_count}</span> ({data.percentage}%)
        </div>
      </div>
    );
  }
  return null;
};

export default function StoragePieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No storage data to display
      </div>
    );
  }

  // Filter out zero-byte categories
  const chartData = data.filter((d) => d.total_bytes > 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="total_bytes"
            nameKey="category"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#64748b'} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
