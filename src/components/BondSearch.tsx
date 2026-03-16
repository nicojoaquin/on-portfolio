"use client";

import { useState, useRef, useEffect } from "react";
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

  const search = (q: string) => {
    clearTimeout(debounceRef.current);
    setQuery(q);

    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search: q, limit: "15", page: "1" });
        const res = await fetch(`/api/bonds?${params}`);
        const data = await res.json();
        setResults(data.data);
        setOpen(true);
        setHighlightIdx(-1);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const select = (bond: BondDTO) => {
    onChange(bond);
    setQuery(`${bond.ticker} — ${bond.issuer}`);
    setOpen(false);
    setResults([]);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      select(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar ticker o emisor..."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {value && (
          <button
            onClick={clear}
            type="button"
            className="ml-1 rounded border border-slate-300 px-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            x
          </button>
        )}
      </div>
      {loading && (
        <div className="absolute right-2 top-2.5 text-xs text-slate-400">...</div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg">
          {results.map((bond, idx) => (
            <li
              key={bond.id}
              onClick={() => select(bond)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                idx === highlightIdx ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="font-medium">{bond.ticker}</span>
              <span className="ml-2 text-slate-500">{bond.issuer}</span>
              {bond.lastPrice != null && (
                <span className="ml-2 text-xs text-emerald-600">
                  ARS {bond.lastPrice.toLocaleString("es-AR")}
                </span>
              )}
              {!bond.hasTerms && (
                <span className="ml-2 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700">Sin datos</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && results.length === 0 && !loading && (
        <div className="absolute z-20 mt-1 w-full rounded border border-slate-200 bg-white px-3 py-3 text-center text-xs text-slate-400 shadow-lg">
          No se encontraron ONs para &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
