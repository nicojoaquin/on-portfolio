"use client";

import { useState, useEffect, useCallback } from "react";
import { BondDTO, BondFilters, PaginatedBonds } from "@/types";

const DEFAULT_FILTERS: BondFilters = {
  search: "",
  currency: "",
  law: "",
  hasTerms: "",
  withPrice: "",
};

export function useBonds() {
  const [bonds, setBonds] = useState<BondDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState<BondFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);

  const fetchBonds = useCallback(async (p?: number, f?: BondFilters) => {
    const currentPage = p ?? page;
    const currentFilters = f ?? filters;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", String(limit));
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.currency) params.set("currency", currentFilters.currency);
    if (currentFilters.law) params.set("law", currentFilters.law);
    if (currentFilters.hasTerms) params.set("hasTerms", currentFilters.hasTerms);
    if (currentFilters.withPrice) params.set("withPrice", currentFilters.withPrice);

    const res = await fetch(`/api/bonds?${params.toString()}`);
    const data: PaginatedBonds = await res.json();
    setBonds(data.data);
    setTotal(data.total);
    setPage(data.page);
    setTotalPages(data.totalPages);
    setLoading(false);
  }, [page, filters, limit]);

  useEffect(() => {
    fetchBonds();
  }, [fetchBonds]);

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setPage(clamped);
    fetchBonds(clamped, filters);
  };

  const updateFilters = (newFilters: Partial<BondFilters>) => {
    const merged = { ...filters, ...newFilters };
    setFilters(merged);
    setPage(1);
    fetchBonds(1, merged);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    fetchBonds(1, DEFAULT_FILTERS);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createBond = async (bond: Record<string, any>) => {
    const res = await fetch("/api/bonds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bond),
    });
    if (!res.ok) throw new Error("Failed to create bond");
    await fetchBonds(page, filters);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateBond = async (id: string, bond: Record<string, any>) => {
    const res = await fetch(`/api/bonds/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bond),
    });
    if (!res.ok) throw new Error("Failed to update bond");
    await fetchBonds(page, filters);
  };

  const deleteBond = async (id: string) => {
    const res = await fetch(`/api/bonds/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete bond");
    await fetchBonds(page, filters);
  };

  return {
    bonds,
    total,
    page,
    totalPages,
    filters,
    loading,
    goToPage,
    updateFilters,
    resetFilters,
    createBond,
    updateBond,
    deleteBond,
    refetch: () => fetchBonds(page, filters),
  };
}
