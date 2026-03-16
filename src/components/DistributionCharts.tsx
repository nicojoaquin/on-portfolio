"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#0ea5e9", "#d946ef",
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

function MiniPie({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex-1 min-w-[280px]">
      <h4 className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, value }) => `${name} ${((value / total) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              `USD ${Number(value).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DistributionCharts({ positions }: Props) {
  if (positions.length === 0) return null;

  const byIssuer = groupBy(positions, "issuer");
  const byCurrency = groupBy(positions, "currency");
  const byLaw = groupBy(positions, "law");
  const byRating = groupBy(positions, "creditRating");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">
        Distribución de Cartera
      </h3>
      <div className="flex flex-wrap gap-4">
        <MiniPie data={byIssuer} title="Por Emisor" />
        <MiniPie data={byLaw} title="Por Ley" />
        {byCurrency.length > 1 && <MiniPie data={byCurrency} title="Por Moneda" />}
        {byRating.length > 1 && <MiniPie data={byRating} title="Por Rating" />}
      </div>
    </div>
  );
}
