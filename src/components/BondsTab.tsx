"use client";

import { useState } from "react";
import { BondDTO } from "@/types";
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
  onCreateBond: (bond: BondFormData) => Promise<void>;
  onUpdateBond: (id: string, bond: BondFormData) => Promise<void>;
  onDeleteBond: (id: string) => Promise<void>;
  onRefreshQuotes: () => Promise<void>;
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

export default function BondsTab({ bonds, onCreateBond, onUpdateBond, onDeleteBond, onRefreshQuotes }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      couponRate: (bond.couponRate * 100).toString(),
      couponFrequency: bond.couponFrequency.toString(),
      firstCouponDate: bond.firstCouponDate.slice(0, 10),
      maturityDate: bond.maturityDate.slice(0, 10),
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

    if (!form.ticker || !form.issuer || !form.firstCouponDate || !form.maturityDate) {
      setError("Completá todos los campos obligatorios.");
      return;
    }

    const couponRate = parseNumber(form.couponRate);
    if (isNaN(couponRate) || couponRate <= 0) {
      setError("El cupón anual debe ser un número válido mayor a 0.");
      return;
    }

    const data: BondFormData = {
      ticker: form.ticker,
      issuer: form.issuer,
      currency: form.currency,
      law: form.law,
      couponRate: couponRate / 100,
      couponFrequency: parseInt(form.couponFrequency),
      firstCouponDate: form.firstCouponDate,
      maturityDate: form.maturityDate,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Base de Obligaciones Negociables ({bonds.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {refreshing ? "Actualizando..." : "Actualizar Cotizaciones"}
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nueva ON
            </button>
          )}
        </div>
      </div>

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
            {bonds.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  No hay ONs cargadas. Creá una nueva.
                </td>
              </tr>
            )}
            {bonds.map((bond) => (
              <tr key={bond.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{bond.ticker}</td>
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
                <td className="px-4 py-3 text-right">{(bond.couponRate * 100).toFixed(1)}%</td>
                <td className="px-4 py-3">{freqLabel[bond.couponFrequency] || `${bond.couponFrequency}x`}</td>
                <td className="px-4 py-3">{formatDate(bond.maturityDate)}</td>
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
    </div>
  );
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
