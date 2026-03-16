"use client";

import { useState, useMemo } from "react";
import { PositionDTO, BondDTO } from "@/types";
import {
  calculatePortfolio,
  BondParams,
  PortfolioPosition,
  AmortScheduleEntry,
} from "@/lib/financial";
import { formatCurrency, formatPercent, formatDate, formatNumber } from "@/lib/formatters";
import YieldCurveChart from "./YieldCurveChart";
import DistributionCharts from "./DistributionCharts";

function toBondParams(bond: BondDTO): BondParams {
  const customAmort: AmortScheduleEntry[] = bond.customAmortSchedule
    ? JSON.parse(bond.customAmortSchedule)
    : [];

  return {
    ticker: bond.ticker,
    couponRate: bond.couponRate,
    couponFrequency: bond.couponFrequency,
    firstCouponDate: new Date(bond.firstCouponDate),
    maturityDate: new Date(bond.maturityDate),
    amortizationType: bond.amortizationType as "bullet" | "equal" | "custom",
    amortStartDate: bond.amortStartDate ? new Date(bond.amortStartDate) : undefined,
    amortPayments: bond.amortPayments || undefined,
    customAmortSchedule: customAmort.length > 0 ? customAmort : undefined,
  };
}

function yearsToMaturity(maturityDate: string): number {
  const now = new Date();
  const mat = new Date(maturityDate);
  return (mat.getTime() - now.getTime()) / (365.25 * 86_400_000);
}

interface Props {
  positions: PositionDTO[];
  bonds: BondDTO[];
  onAddPosition: (data: { bondId: string; nominal: number; dirtyPrice: number }) => Promise<void>;
  onUpdatePosition: (id: string, data: { nominal?: number; dirtyPrice?: number }) => Promise<void>;
  onDeletePosition: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export default function PortfolioTab({
  positions,
  bonds,
  onAddPosition,
  onUpdatePosition,
  onDeletePosition,
  onClearAll,
}: Props) {
  const [selectedBondId, setSelectedBondId] = useState("");
  const [nominal, setNominal] = useState("");
  const [dirtyPrice, setDirtyPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNominal, setEditNominal] = useState("");
  const [editDirty, setEditDirty] = useState("");
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleBondSelect = (bondId: string) => {
    setSelectedBondId(bondId);
    setDirtyPrice("");
  };

  const portfolioResult = useMemo(() => {
    const portfolioPositions: PortfolioPosition[] = positions.map((p) => ({
      bond: toBondParams(p.bond),
      nominal: p.nominal,
      dirtyPrice: p.dirtyPrice,
    }));
    return calculatePortfolio(portfolioPositions);
  }, [positions]);

  const yieldCurveData = useMemo(() => {
    return positions
      .map((pos, idx) => {
        const result = portfolioResult.positionResults[idx];
        if (!result || result.tir === null) return null;
        return {
          ticker: pos.bond.ticker,
          yearsToMaturity: yearsToMaturity(pos.bond.maturityDate),
          tir: result.tir,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [positions, portfolioResult]);

  const distributionData = useMemo(() => {
    return positions.map((pos, idx) => ({
      ticker: pos.bond.ticker,
      issuer: pos.bond.issuer,
      currency: pos.bond.currency,
      law: pos.bond.law,
      marketValue: portfolioResult.positionResults[idx]?.marketValue || 0,
      creditRating: pos.bond.creditRating,
    }));
  }, [positions, portfolioResult]);

  const handleAdd = async () => {
    if (!selectedBondId || !nominal || !dirtyPrice) return;
    await onAddPosition({
      bondId: selectedBondId,
      nominal: parseFloat(nominal),
      dirtyPrice: parseFloat(dirtyPrice),
    });
    setSelectedBondId("");
    setNominal("");
    setDirtyPrice("");
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdatePosition(id, {
      nominal: parseFloat(editNominal),
      dirtyPrice: parseFloat(editDirty),
    });
    setEditingId(null);
  };

  const startEdit = (pos: PositionDTO) => {
    setEditingId(pos.id);
    setEditNominal(pos.nominal.toString());
    setEditDirty(pos.dirtyPrice.toString());
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cartera-on-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("¿Borrar TODAS las posiciones? Esta acción no se puede deshacer.")) return;
    setClearing(true);
    try {
      await onClearAll();
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Valor de Mercado"
          value={formatCurrency(portfolioResult.totalMarketValue)}
        />
        <MetricCard
          label="TIR Cartera (XIRR)"
          value={formatPercent(portfolioResult.portfolioTIR)}
          highlight
        />
        <MetricCard
          label="TIR Prom. Ponderada"
          value={formatPercent(portfolioResult.weightedAvgTIR)}
        />
        <MetricCard
          label="Total Cobros Futuros"
          value={formatCurrency(portfolioResult.totalFutureCashFlows)}
        />
      </div>

      {/* Action buttons */}
      {positions.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {exporting ? "Exportando..." : "Exportar Excel"}
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {clearing ? "Borrando..." : "Borrar Todo"}
          </button>
        </div>
      )}

      {/* Charts */}
      {positions.length > 0 && (
        <>
          <YieldCurveChart data={yieldCurveData} />
          <DistributionCharts positions={distributionData} />
        </>
      )}

      {/* Add position form */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Agregar Posición</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-slate-500">Especie</label>
            <select
              value={selectedBondId}
              onChange={(e) => handleBondSelect(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {bonds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.ticker} — {b.issuer}
                  {b.lastPrice ? ` (ARS ${b.lastPrice.toLocaleString("es-AR")})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs text-slate-500">Nominal</label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="10000"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs text-slate-500">Precio Dirty (%)</label>
            <input
              type="number"
              step="0.01"
              value={dirtyPrice}
              onChange={(e) => setDirtyPrice(e.target.value)}
              placeholder="105.50"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!selectedBondId || !nominal || !dirtyPrice}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Positions table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Emisor</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3 text-right">Dirty (%)</th>
              <th className="px-4 py-3 text-right">Market Value</th>
              <th className="px-4 py-3 text-right">TIR</th>
              <th className="px-4 py-3 text-right">Próx. Cobro</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No hay posiciones. Agregá una arriba.
                </td>
              </tr>
            )}
            {positions.map((pos, idx) => {
              const result = portfolioResult.positionResults[idx];
              const isEditing = editingId === pos.id;

              return (
                <tr key={pos.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{pos.bond.ticker}</td>
                  <td className="px-4 py-3 text-slate-600">{pos.bond.issuer}</td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editNominal}
                        onChange={(e) => setEditNominal(e.target.value)}
                        className="w-24 rounded border px-2 py-1 text-right text-sm"
                      />
                    ) : (
                      formatNumber(pos.nominal, 0)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editDirty}
                        onChange={(e) => setEditDirty(e.target.value)}
                        className="w-24 rounded border px-2 py-1 text-right text-sm"
                      />
                    ) : (
                      formatNumber(pos.dirtyPrice)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {result ? formatCurrency(result.marketValue) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    {result ? formatPercent(result.tir) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">
                    {result?.nextPaymentDate
                      ? `${formatDate(result.nextPaymentDate)} (${formatCurrency(result.nextPaymentAmount)})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(pos.id)}
                          className="rounded bg-emerald-500 px-2 py-1 text-xs text-white hover:bg-emerald-600"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded bg-slate-300 px-2 py-1 text-xs hover:bg-slate-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => startEdit(pos)}
                          className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDeletePosition(pos.id)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          highlight ? "text-blue-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
