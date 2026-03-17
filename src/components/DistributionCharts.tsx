"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PositionData {
  ticker: string;
  issuer: string;
  currency: string;
  law: string;
  marketValue: number;
  creditRating: string | null;
}

interface Props {
  positions: PositionData[];
}

// Paleta profesional — banco de inversión
const COLORS = [
  "#1d4ed8",
  "#0f766e",
  "#b45309",
  "#6d28d9",
  "#0369a1",
  "#15803d",
  "#be123c",
  "#0e7490",
  "#92400e",
  "#1e40af",
  "#065f46",
  "#7c3aed",
];

function groupBy(positions: PositionData[], key: keyof PositionData) {
  const groups = new Map<string, number>();
  for (const p of positions) {
    const label = (p[key] as string) || "Sin dato";
    groups.set(label, (groups.get(label) || 0) + p.marketValue);
  }
  return Array.from(groups.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function fmt(value: number) {
  return `USD ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function DonutChart({
  data,
  title,
}: {
  data: { name: string; value: number }[];
  title: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex-1 min-w-[300px]">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="shrink-0 w-[140px] h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={68}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  fontSize: "11px",
                  padding: "6px 10px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                }}
                formatter={(value) => [fmt(Number(value)), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((d, i) => {
            const pct = ((d.value / total) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center gap-2 min-w-0">
                <span
                  className="shrink-0 h-[10px] w-[10px] rounded-[2px]"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span
                  className="flex-1 truncate text-[11px] text-slate-600"
                  title={d.name}
                >
                  {d.name}
                </span>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-800 pl-2">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DistributionCharts({ positions }: Props) {
  if (positions.length === 0) return null;

  const byIssuer = groupBy(positions, "issuer");
  const byCurrency = groupBy(positions, "currency");
  const byLaw = groupBy(positions, "law");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-5 text-sm font-semibold text-slate-800">
        Distribución de Cartera
      </h3>
      <div className="flex flex-wrap gap-8">
        <DonutChart data={byIssuer} title="Por Emisor" />
        <DonutChart data={byLaw} title="Por Ley" />
        {byCurrency.length > 1 && (
          <DonutChart data={byCurrency} title="Por Moneda" />
        )}
      </div>
    </div>
  );
}
