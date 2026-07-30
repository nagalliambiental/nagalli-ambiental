"use client";

import React, { useState, useMemo } from "react";
import { Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/Toast";

export interface Column<T extends { id: number }> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps<T extends { id: number }> {
  data: T[];
  columns: Column<T>[];
  endpoint: string;
  emptyMessage?: string;
  searchQuery?: string | null;
  extraBulkActions?: React.ReactNode | ((selectedIds: number[]) => React.ReactNode);
  extraRow?: (item: T) => React.ReactNode;
  pageSize?: number;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  endpoint,
  emptyMessage = "Nenhum registro encontrado",
  searchQuery,
  extraBulkActions,
  extraRow,
  pageSize = 20,
}: DataTableProps<T>) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(data.map((r) => r.id)));
  };

  const bulkAction = async (method: string, body?: object) => {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch(
        `${endpoint}?ids=${ids.join(",")}`,
        { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }
      );
      if (!res.ok) throw new Error("Erro na operação em lote");
      setSelectedIds(new Set());
      toast(`${ids.length} registro(s) atualizado(s) com sucesso`, "success");
      window.location.reload();
    } catch {
      toast("Erro ao executar operação em lote.", "error");
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bVal = String((b as Record<string, unknown>)[sortKey] ?? "");
      const cmp = aVal.localeCompare(bVal, "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasAtivo = data.length > 0 && "ativo" in data[0];

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-4 py-2">
          <span className="text-sm text-[var(--color-ink-500)]">{selectedIds.size} selecionado(s)</span>
          <div className="flex items-center gap-2">
            {typeof extraBulkActions === "function" ? extraBulkActions(Array.from(selectedIds)) : extraBulkActions}
            {hasAtivo && (
              <>
                <button
                  type="button"
                  onClick={() => bulkAction("PATCH", { ativo: true })}
                  className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
                >
                  <ToggleRight size={14} />
                  Ativar
                </button>
                <button
                  type="button"
                  onClick={() => bulkAction("PATCH", { ativo: false })}
                  className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-zinc-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  <ToggleLeft size={14} />
                  Inativar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remover ${selectedIds.size} registro(s)?`)) bulkAction("DELETE");
              }}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 size={14} />
              Remover
            </button>
          </div>
        </div>
      )}
      {data.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col className="w-[3%]" />
                {columns.map((_, i) => (
                  <col key={i} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                  <th className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onChange={toggleSelectAll}
                      className="accent-[var(--color-brand-500)]"
                    />
                  </th>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`text-left p-4 font-medium ${col.headerClassName || ""} ${col.sortable ? "cursor-pointer select-none hover:text-[var(--color-ink-700)]" : ""}`}
                      onClick={() => col.sortable && col.sortKey && handleSort(col.sortKey)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && sortKey === col.sortKey && (
                          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="accent-[var(--color-brand-500)]"
                        />
                      </td>
                      {columns.map((col, i) => (
                        <td key={i} className={`p-4 ${col.className || ""}`}>
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                    {extraRow?.(item)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-paper-200)] px-4 py-3">
            <span className="text-sm text-[var(--color-ink-500)]">
              {sorted.length} registro(s) — Página {safePage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="focus-ring flex items-center gap-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] disabled:opacity-30"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="focus-ring flex items-center gap-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-sm text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] disabled:opacity-30"
              >
                Próximo
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
          <p className="text-sm">{searchQuery ? "Nenhum registro encontrado para essa busca" : emptyMessage}</p>
        </div>
      )}
    </>
  );
}
