"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DurationPoint {
  ticker: string;
  modifiedDuration: number;
  weight: number; // fraction 0-1
}

interface Props {
  data: DurationPoint[];
  portfolioDuration: number;
}

function CustomTooltip({
  payload,
  active,
}: {
  payload?: { payload: DurationPoint }[];
  active?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "4px",
        background: "#fff",
        padding: "8px 12px",
        fontSize: "11px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
        lineHeight: "1.6",
      }}
    >
      <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{d.ticker}</p>
      <p style={{ color: "#64748b" }}>
        Dur. Modificada:{" "}
        <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
          {d.modifiedDuration.toFixed(2)} años
        </span>
      </p>
      <p style={{ color: "#64748b" }}>
        Peso: <span style={{ fontWeight: 600 }}>{(d.weight * 100).toFixed(1)}%</span>
      </p>
    </div>
  );
}

export default function DurationChart({ data, portfolioDuration }: Props) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => b.modifiedDuration - a.modifiedDuration);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Duration Modificada</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Por Instrumento
          </span>
          <span className="font-mono text-sm font-semibold text-slate-700">
            Cartera: {portfolioDuration.toFixed(2)} años
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 36)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
        >
          <CartesianGrid strokeDasharray="" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v: number) => `${v.toFixed(1)}a`}
          />
          <YAxis
            type="category"
            dataKey="ticker"
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <ReferenceLine
            x={portfolioDuration}
            stroke="#93c5fd"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            label={{
              value: `${portfolioDuration.toFixed(2)}a`,
              position: "right",
              fontSize: 10,
              fill: "#93c5fd",
            }}
          />
          <Bar dataKey="modifiedDuration" fill="#1d4ed8" radius={[0, 2, 2, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
