"use client";

import React, { useState, useDeferredValue, useMemo } from "react";
import { Search, X } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";

export type { Column };

interface FilterableDataTableProps<T extends { id: number }> {
  data: T[];
  columns: Column<T>[];
  endpoint: string;
  placeholder?: string;
  emptyMessage?: string;
  pageSize?: number;
  searchFields?: ((item: T) => string)[];
  extraBulkActions?: React.ReactNode | ((selectedIds: number[]) => React.ReactNode);
  extraRow?: (item: T) => React.ReactNode;
}

export function FilterableDataTable<T extends { id: number }>({
  data,
  columns,
  endpoint,
  placeholder = "Buscar...",
  emptyMessage = "Nenhum registro encontrado",
  pageSize = 20,
  searchFields = [],
  extraBulkActions,
  extraRow,
}: FilterableDataTableProps<T>) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return data;
    return data.filter((item) => searchFields.some((fn) => fn(item).toLowerCase().includes(q)));
  }, [data, q, searchFields]);

  return (
    <div>
      <div className="relative border-b border-[var(--color-paper-200)]">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white py-3 pl-10 pr-10 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        endpoint={endpoint}
        emptyMessage={emptyMessage}
        searchQuery={q || null}
        extraBulkActions={extraBulkActions}
        extraRow={extraRow}
        pageSize={pageSize}
      />
    </div>
  );
}