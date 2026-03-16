"use client";

import {
  ScatterChart,
  Scatter,
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

interface Props {
  data: DataPoint[];
}

export default function YieldCurveChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Yield Curve — TIR vs Plazo
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="yearsToMaturity" name="Años">
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
              return (
                <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow">
                  <p className="font-semibold">{d.ticker}</p>
                  <p>TIR: {(d.tir * 100).toFixed(2)}%</p>
                  <p>Plazo: {d.yearsToMaturity.toFixed(1)} años</p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill="#3b82f6" r={6} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
