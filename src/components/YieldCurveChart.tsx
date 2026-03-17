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
  Label,
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
  const steps = 60;

  return Array.from({ length: steps }, (_, i) => {
    const x = minX + (maxX - minX) * (i / (steps - 1));
    return { yearsToMaturity: x, tir: fit.a * Math.log(x) + fit.b };
  });
}

export default function YieldCurveChart({ data }: Props) {
  if (data.length === 0) return null;

  const fit = fitLogCurve(data);
  const curvePoints = fit && data.length >= 2 ? buildCurvePoints(data, fit) : [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Yield Curve — TIR vs Plazo
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="yearsToMaturity" name="Años" domain={["auto", "auto"]}>
            <Label value="Años al Vencimiento" offset={-10} position="insideBottom" />
          </XAxis>
          <YAxis
            type="number"
            dataKey="tir"
            name="TIR"
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
          >
            <Label value="TIR (%)" angle={-90} position="insideLeft" />
          </YAxis>
          <Tooltip
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const d = payload[0].payload as DataPoint;
              if (!d.ticker) return null;
              return (
                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow">
                  <p className="font-semibold">{d.ticker}</p>
                  <p>TIR: {(d.tir * 100).toFixed(2)}%</p>
                  <p>Plazo: {d.yearsToMaturity.toFixed(1)} años</p>
                </div>
              );
            }}
          />
          {curvePoints.length > 0 && (
            <Line
              data={curvePoints}
              type="monotone"
              dataKey="tir"
              dot={false}
              strokeWidth={2}
              stroke="#94a3b8"
              strokeDasharray="4 2"
            />
          )}
          <Scatter data={data} fill="#3b82f6" r={6} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
