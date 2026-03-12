"use client";

import { useState, useEffect, useCallback } from "react";
import { BondDTO } from "@/types";

export function useBonds() {
  const [bonds, setBonds] = useState<BondDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBonds = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/bonds");
    const data = await res.json();
    setBonds(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBonds();
  }, [fetchBonds]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createBond = async (bond: Record<string, any>) => {
    const res = await fetch("/api/bonds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bond),
    });
    if (!res.ok) throw new Error("Failed to create bond");
    await fetchBonds();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateBond = async (id: string, bond: Record<string, any>) => {
    const res = await fetch(`/api/bonds/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bond),
    });
    if (!res.ok) throw new Error("Failed to update bond");
    await fetchBonds();
  };

  const deleteBond = async (id: string) => {
    const res = await fetch(`/api/bonds/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete bond");
    await fetchBonds();
  };

  return { bonds, loading, createBond, updateBond, deleteBond, refetch: fetchBonds };
}
