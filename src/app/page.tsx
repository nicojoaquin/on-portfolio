"use client";

import { useState } from "react";
import { TabId } from "@/types";
import { useBonds } from "@/hooks/useBonds";
import { usePositions } from "@/hooks/usePositions";
import PortfolioTab from "@/components/PortfolioTab";
import CouponsTab from "@/components/CouponsTab";
import BondsTab from "@/components/BondsTab";

const TABS: { id: TabId; label: string }[] = [
  { id: "portfolio", label: "Cartera" },
  { id: "coupons", label: "Cupones" },
  { id: "bonds", label: "Base ONs" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("portfolio");
  const bondsHook = useBonds();
  const { positions, addPosition, updatePosition, deletePosition, clearAll } = usePositions();

  const refreshQuotes = async () => {
    await fetch("/api/quotes");
    await bondsHook.refetch();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">ON Portfolio</h1>
        <p className="text-sm text-slate-500">
          Calculadora de TIR para cartera de Obligaciones Negociables
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "portfolio" && (
        <PortfolioTab
          positions={positions}
          bonds={bondsHook.bonds}
          onAddPosition={addPosition}
          onUpdatePosition={updatePosition}
          onDeletePosition={deletePosition}
          onClearAll={clearAll}
        />
      )}
      {activeTab === "coupons" && <CouponsTab positions={positions} />}
      {activeTab === "bonds" && (
        <BondsTab
          bonds={bondsHook.bonds}
          total={bondsHook.total}
          page={bondsHook.page}
          totalPages={bondsHook.totalPages}
          filters={bondsHook.filters}
          loading={bondsHook.loading}
          onGoToPage={bondsHook.goToPage}
          onUpdateFilters={bondsHook.updateFilters}
          onResetFilters={bondsHook.resetFilters}
          onCreateBond={bondsHook.createBond}
          onUpdateBond={bondsHook.updateBond}
          onDeleteBond={bondsHook.deleteBond}
          onRefreshQuotes={refreshQuotes}
          onImportComplete={bondsHook.refetch}
        />
      )}
    </div>
  );
}
