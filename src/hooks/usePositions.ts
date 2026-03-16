"use client";

import { useState, useEffect, useCallback } from "react";
import { PositionDTO } from "@/types";

export function usePositions() {
  const [positions, setPositions] = useState<PositionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/positions");
    const data = await res.json();
    setPositions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const addPosition = async (position: {
    bondId: string;
    nominal: number;
    dirtyPrice: number;
  }) => {
    const res = await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(position),
    });
    if (!res.ok) throw new Error("Failed to add position");
    await fetchPositions();
  };

  const updatePosition = async (
    id: string,
    data: { nominal?: number; dirtyPrice?: number }
  ) => {
    const res = await fetch(`/api/positions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update position");
    await fetchPositions();
  };

  const deletePosition = async (id: string) => {
    const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete position");
    await fetchPositions();
  };

  const clearAll = async () => {
    const res = await fetch("/api/positions/clear", { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to clear positions");
    await fetchPositions();
  };

  return {
    positions,
    loading,
    addPosition,
    updatePosition,
    deletePosition,
    clearAll,
    refetch: fetchPositions,
  };
}
