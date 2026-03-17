"use client";

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  ticker: string;
  yearsToMaturity: number;
  tir: number;
}

interface CurvePoint {
  yearsToMaturity: number;
  tir: number;
}

interface Props {
  data: DataPoint[];
}

function fitLogCurve(data: DataPoint[]): { a: number; b: number } | null {
  const valid = data.filter((d) => d.yearsToMaturity > 0);
  if (valid.length < 2) return null;

  const n = valid.length;
  const lnX = valid.map((d) => Math.log(d.yearsToMaturity));
  const y = valid.map((d) => d.tir);

  const sumLnX = lnX.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumLnXY = lnX.reduce((s, v, i) => s + v * y[i], 0);
  const sumLnX2 = lnX.reduce((s, v) => s + v * v, 0);

  const denom = n * sumLnX2 - sumLnX * sumLnX;
  if (Math.abs(denom) < 1e-12) return null;

  const a = (n * sumLnXY - sumLnX * sumY) / denom;
  const b = (sumY - a * sumLnX) / n;
  return { a, b };
}

function buildCurvePoints(
  data: DataPoint[],
  fit: { a: number; b: number }
): CurvePoint[] {
  const xs = data.map((d) => d.yearsToMaturity).filter((x) => x > 0);
  const minX = Math.max(0.01, Math.min(...xs));
  const maxX = Math.max(...xs);

  return Array.from({ length: 80 }, (_, i) => {
    const x = minX + (maxX - minX) * (i / 79);
    return { yearsToMaturity: x, tir: fit.a * Math.log(x) + fit.b };
  });
}

function CustomTooltip({ payload }: { payload?: { payload: DataPoint }[] }) {
  if (!payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d?.ticker) return null;

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
      <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
        {d.ticker}
      </p>
      <p style={{ color: "#64748b" }}>
        TIR:{" "}
        <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
          {(d.tir * 100).toFixed(2)}%
        </span>
      </p>
      <p style={{ color: "#64748b" }}>
        Plazo: {d.yearsToMaturity.toFixed(1)} años
      </p>
    </div>
  );
}

export default function YieldCurveChart({ data }: Props) {
  if (data.length === 0) return null;

  const fit = fitLogCurve(data);
  const curvePoints = fit && data.length >= 2 ? buildCurvePoints(data, fit) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Yield Curve</h3>
        <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
          TIR vs Plazo al Vencimiento
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart margin={{ top: 8, right: 24, bottom: 28, left: 16 }}>
          <CartesianGrid
            strokeDasharray=""
            stroke="#f1f5f9"
            vertical={false}
          />
          <XAxis
            type="number"
            dataKey="yearsToMaturity"
            name="Años"
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            label={{
              value: "Años al Vencimiento",
              position: "insideBottom",
              offset: -16,
              fontSize: 10,
              fill: "#94a3b8",
            }}
          />
          <YAxis
            type="number"
            dataKey="tir"
            name="TIR"
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          {curvePoints.length > 0 && (
            <Line
              data={curvePoints}
              type="monotone"
              dataKey="tir"
              dot={false}
              strokeWidth={1.5}
              stroke="#93c5fd"
              strokeDasharray=""
            />
          )}
          <Scatter
            data={data}
            fill="#1d4ed8"
            r={4}
            strokeWidth={0}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
