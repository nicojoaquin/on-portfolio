"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BondDTO } from "@/types";

interface Props {
  value: BondDTO | null;
  onChange: (bond: BondDTO | null) => void;
}

export default function BondSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BondDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "15", page: "1" });
      if (q.trim()) params.set("search", q);
      const res = await fetch(`/api/bonds?${params}`);
      const data = await res.json();
      setResults(data.data);
      setOpen(true);
      setHighlightIdx(-1);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (q: string) => {
    clearTimeout(debounceRef.current);
    setQuery(q);
    debounceRef.current = setTimeout(() => fetchResults(q), 200);
  };

  const handleOpen = () => {
    if (!open) {
      fetchResults(query);
      inputRef.current?.focus();
    } else {
      setOpen(false);
    }
  };

  const select = (bond: BondDTO) => {
    onChange(bond);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        fetchResults(query);
      } else {
        setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0 && open) {
      e.preventDefault();
      select(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const displayValue = value ? `${value.ticker} — ${value.issuer}` : "";

  return (
    <div ref={containerRef} className="relative">
      {/* Select-like trigger */}
      <div
        onClick={handleOpen}
        className={`flex cursor-pointer items-center rounded border bg-white text-sm transition-colors ${
          open ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-300 hover:border-slate-400"
        }`}
      >
        {value && !open ? (
          <>
            <span className="flex-1 truncate px-3 py-2 text-slate-900">{displayValue}</span>
            <button
              onClick={clear}
              type="button"
              className="px-2 text-slate-400 hover:text-slate-600"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => { if (!open) fetchResults(query); }}
              onKeyDown={handleKeyDown}
              placeholder="Seleccionar ON..."
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
            />
            {loading ? (
              <span className="px-2 text-xs text-slate-400">...</span>
            ) : (
              <svg
                className={`mr-2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            )}
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg">
          {results.length > 0 ? (
            <ul className="max-h-60 overflow-auto">
              {results.map((bond, idx) => (
                <li
                  key={bond.id}
                  onClick={() => select(bond)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`cursor-pointer px-3 py-2.5 text-sm ${
                    idx === highlightIdx ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-medium ${idx === highlightIdx ? "text-blue-700" : "text-slate-900"}`}>
                        {bond.ticker}
                      </span>
                      <span className="ml-2 text-slate-500">{bond.issuer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bond.lastPrice != null && (
                        <span className="text-xs text-emerald-600">
                          ARS {bond.lastPrice.toLocaleString("es-AR")}
                        </span>
                      )}
                      {!bond.hasTerms && (
                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700">Sin datos</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <div className="px-3 py-3 text-center text-xs text-slate-400">
              {query.trim()
                ? `No se encontraron ONs para "${query}"`
                : "No hay ONs disponibles"}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
