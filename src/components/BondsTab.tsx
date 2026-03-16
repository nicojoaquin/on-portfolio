"use client";

import { useState, useRef } from "react";
import { BondDTO, BondFilters } from "@/types";
import { formatDate } from "@/lib/formatters";

interface BondFormData {
  ticker: string;
  issuer: string;
  currency: string;
  law: string;
  couponRate: number;
  couponFrequency: number;
  firstCouponDate: string;
  maturityDate: string;
  amortizationType: string;
  amortStartDate: string | null;
  amortPayments: number | null;
  customAmortSchedule: { date: string; pct: number }[] | null;
  minDenomination: number | null;
  creditRating: string | null;
}

interface Props {
  bonds: BondDTO[];
  total: number;
  page: number;
  totalPages: number;
  filters: BondFilters;
  loading: boolean;
  onGoToPage: (page: number) => void;
  onUpdateFilters: (filters: Partial<BondFilters>) => void;
  onResetFilters: () => void;
  onCreateBond: (bond: BondFormData) => Promise<void>;
  onUpdateBond: (id: string, bond: BondFormData) => Promise<void>;
  onDeleteBond: (id: string) => Promise<void>;
  onRefreshQuotes: () => Promise<void>;
  onImportComplete: () => Promise<void>;
}

const EMPTY_FORM = {
  ticker: "",
  issuer: "",
  currency: "USD",
  law: "NY",
  couponRate: "",
  couponFrequency: "2",
  firstCouponDate: "",
  maturityDate: "",
  amortizationType: "bullet",
  amortStartDate: "",
  amortPayments: "",
  customAmortText: "",
  minDenomination: "",
  creditRating: "",
};

function parseNumber(value: string): number {
  return parseFloat(value.replace(",", "."));
}

export default function BondsTab({
  bonds, total, page, totalPages, filters, loading,
  onGoToPage, onUpdateFilters, onResetFilters,
  onCreateBond, onUpdateBond, onDeleteBond, onRefreshQuotes, onImportComplete,
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const startEdit = (bond: BondDTO) => {
    const customSchedule = bond.customAmortSchedule
      ? JSON.parse(bond.customAmortSchedule)
          .map((e: { date: string; pct: number }) => `${e.date}: ${e.pct}`)
          .join("\n")
      : "";

    setForm({
      ticker: bond.ticker,
      issuer: bond.issuer,
      currency: bond.currency,
      law: bond.law || "NY",
      couponRate: bond.couponRate != null ? (bond.couponRate * 100).toString() : "",
      couponFrequency: bond.couponFrequency?.toString() || "2",
      firstCouponDate: bond.firstCouponDate?.slice(0, 10) || "",
      maturityDate: bond.maturityDate?.slice(0, 10) || "",
      amortizationType: bond.amortizationType,
      amortStartDate: bond.amortStartDate?.slice(0, 10) || "",
      amortPayments: bond.amortPayments?.toString() || "",
      customAmortText: customSchedule,
      minDenomination: bond.minDenomination?.toString() || "",
      creditRating: bond.creditRating || "",
    });
    setEditingId(bond.id);
    setShowForm(true);
    setError(null);
  };

  const parseCustomAmort = (text: string): { date: string; pct: number }[] => {
    if (!text.trim()) return [];
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const [date, pct] = line.split(":").map((s) => s.trim());
        return { date, pct: parseNumber(pct) };
      });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!form.ticker || !form.issuer) {
      setError("Completá ticker y emisor como mínimo.");
      return;
    }

    const couponRate = form.couponRate ? parseNumber(form.couponRate) : null;
    if (couponRate !== null && (isNaN(couponRate) || couponRate <= 0)) {
      setError("El cupón anual debe ser un número válido mayor a 0.");
      return;
    }

    const data: BondFormData = {
      ticker: form.ticker,
      issuer: form.issuer,
      currency: form.currency,
      law: form.law,
      couponRate: couponRate !== null ? couponRate / 100 : 0,
      couponFrequency: parseInt(form.couponFrequency),
      firstCouponDate: form.firstCouponDate || "",
      maturityDate: form.maturityDate || "",
      amortizationType: form.amortizationType,
      amortStartDate: form.amortStartDate || null,
      amortPayments: form.amortPayments ? parseInt(form.amortPayments) : null,
      customAmortSchedule:
        form.amortizationType === "custom"
          ? parseCustomAmort(form.customAmortText)
          : null,
      minDenomination: form.minDenomination ? parseNumber(form.minDenomination) : null,
      creditRating: form.creditRating || null,
    };

    try {
      if (editingId) {
        await onUpdateBond(editingId, data);
      } else {
        await onCreateBond(data);
      }
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      setError(message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshQuotes();
    } finally {
      setRefreshing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportResult(`Error: ${data.error}`);
      } else {
        setImportResult(`Importados: ${data.created} nuevos, ${data.updated} actualizados, ${data.skipped} omitidos`);
        await onImportComplete();
      }
    } catch {
      setImportResult("Error al importar archivo");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleSearchChange = (value: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      onUpdateFilters({ search: value });
    }, 300);
  };

  const hasActiveFilters = filters.currency || filters.law || filters.hasTerms || filters.withPrice;

  const amortLabel: Record<string, string> = {
    bullet: "Bullet",
    equal: "Cuotas Iguales",
    custom: "Custom",
  };

  const freqLabel: Record<number, string> = {
    1: "Anual",
    2: "Semestral",
    4: "Trimestral",
    12: "Mensual",
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Base de Obligaciones Negociables ({total})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {refreshing ? "Actualizando..." : "Actualizar Cotizaciones"}
          </button>
          <label className={`cursor-pointer rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            {importing ? "Importando..." : "Importar Excel"}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + Nueva ON
            </button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-xs text-slate-500">Buscar</label>
            <input
              type="text"
              defaultValue={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Ticker o emisor..."
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Moneda</label>
            <select
              value={filters.currency}
              onChange={(e) => onUpdateFilters({ currency: e.target.value })}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Ley</label>
            <select
              value={filters.law}
              onChange={(e) => onUpdateFilters({ law: e.target.value })}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="NY">NY</option>
              <option value="ARG">ARG</option>
            </select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs text-slate-500">Datos</label>
            <select
              value={filters.hasTerms}
              onChange={(e) => onUpdateFilters({ hasTerms: e.target.value })}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Con datos</option>
              <option value="false">Sin datos</option>
            </select>
          </div>
          <div className="w-36">
            <label className="mb-1 block text-xs text-slate-500">Cotización</label>
            <select
              value={filters.withPrice}
              onChange={(e) => onUpdateFilters({ withPrice: e.target.value })}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="true">Con precio</option>
              <option value="false">Sin precio</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className={`rounded border px-4 py-2 text-sm ${importResult.startsWith("Error") ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {importResult}
          <button onClick={() => setImportResult(null)} className="ml-2 text-xs underline">Cerrar</button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h4 className="mb-4 font-semibold text-slate-800">
            {editingId ? "Editar ON" : "Nueva ON"}
          </h4>

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Ticker" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v })} placeholder="YPF2026" />
            <Field label="Emisor" value={form.issuer} onChange={(v) => setForm({ ...form, issuer: v })} placeholder="YPF S.A." />
            <div>
              <label className="mb-1 block text-xs text-slate-500">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Ley</label>
              <div className="flex gap-1">
                {["NY", "ARG"].map((law) => (
                  <button
                    key={law}
                    type="button"
                    onClick={() => setForm({ ...form, law })}
                    className={`flex-1 rounded border px-3 py-2 text-sm font-medium transition-colors ${
                      form.law === law
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {law}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Cupón Anual (%)" value={form.couponRate} onChange={(v) => setForm({ ...form, couponRate: v })} placeholder="8.5" />
            <div>
              <label className="mb-1 block text-xs text-slate-500">Frecuencia Cupón</label>
              <select
                value={form.couponFrequency}
                onChange={(e) => setForm({ ...form, couponFrequency: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="1">Anual</option>
                <option value="2">Semestral</option>
                <option value="4">Trimestral</option>
                <option value="12">Mensual</option>
              </select>
            </div>
            <Field label="Fecha Primer Cupón" value={form.firstCouponDate} onChange={(v) => setForm({ ...form, firstCouponDate: v })} type="date" />
            <Field label="Fecha Vencimiento" value={form.maturityDate} onChange={(v) => setForm({ ...form, maturityDate: v })} type="date" />
            <div>
              <label className="mb-1 block text-xs text-slate-500">Tipo Amortización</label>
              <select
                value={form.amortizationType}
                onChange={(e) => setForm({ ...form, amortizationType: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="bullet">Bullet (al vencimiento)</option>
                <option value="equal">Cuotas Iguales</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <Field label="Lámina Mínima (USD)" value={form.minDenomination} onChange={(v) => setForm({ ...form, minDenomination: v })} placeholder="1000" />
            <Field label="Rating FIX SCR" value={form.creditRating} onChange={(v) => setForm({ ...form, creditRating: v })} placeholder="A(arg)" />

            {form.amortizationType === "equal" && (
              <>
                <Field label="Inicio Amortización" value={form.amortStartDate} onChange={(v) => setForm({ ...form, amortStartDate: v })} type="date" />
                <Field label="Cantidad de Pagos" value={form.amortPayments} onChange={(v) => setForm({ ...form, amortPayments: v })} type="number" placeholder="4" />
              </>
            )}

            {form.amortizationType === "custom" && (
              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-xs text-slate-500">
                  Schedule Custom (fecha: porcentaje, uno por línea)
                </label>
                <textarea
                  value={form.customAmortText}
                  onChange={(e) => setForm({ ...form, customAmortText: e.target.value })}
                  rows={4}
                  placeholder={"2028-06-30: 33.33\n2028-12-30: 33.33\n2029-06-30: 33.34"}
                  className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editingId ? "Guardar Cambios" : "Crear ON"}
            </button>
            <button
              onClick={resetForm}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bonds table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {loading && (
          <div className="px-4 py-3 text-center text-xs text-slate-400">Cargando...</div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Emisor</th>
              <th className="px-4 py-3">Moneda</th>
              <th className="px-4 py-3">Ley</th>
              <th className="px-4 py-3 text-right">Cupón</th>
              <th className="px-4 py-3">Frecuencia</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Amortización</th>
              <th className="px-4 py-3 text-right">Lámina Mín.</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3 text-right">Cotización</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!loading && bonds.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  {filters.search || hasActiveFilters
                    ? "No se encontraron ONs con esos filtros."
                    : "No hay ONs cargadas. Creá una nueva."}
                </td>
              </tr>
            )}
            {bonds.map((bond) => (
              <tr key={bond.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {bond.ticker}
                  {!bond.hasTerms && (
                    <span className="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Sin datos</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{bond.issuer}</td>
                <td className="px-4 py-3">{bond.currency}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    bond.law === "NY"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {bond.law || "NY"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {bond.couponRate != null ? `${(bond.couponRate * 100).toFixed(1)}%` : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {bond.couponFrequency != null ? (freqLabel[bond.couponFrequency] || `${bond.couponFrequency}x`) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {bond.maturityDate ? formatDate(bond.maturityDate) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3">{amortLabel[bond.amortizationType] || bond.amortizationType}</td>
                <td className="px-4 py-3 text-right">
                  {bond.minDenomination != null
                    ? bond.minDenomination.toLocaleString("es-AR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {bond.creditRating ? (
                    <span className="inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {bond.creditRating}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {bond.lastPrice != null ? (
                    <span className="font-medium text-emerald-600">
                      ARS {bond.lastPrice.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => startEdit(bond)}
                      className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDeleteBond(bond.id)}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onGoToPage={onGoToPage} />
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onGoToPage }: { page: number; totalPages: number; onGoToPage: (p: number) => void }) {
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onGoToPage(page - 1)}
        disabled={page <= 1}
        className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Anterior
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-xs text-slate-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onGoToPage(p as number)}
            className={`rounded border px-3 py-1.5 text-xs font-medium ${
              p === page
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onGoToPage(page + 1)}
        disabled={page >= totalPages}
        className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
