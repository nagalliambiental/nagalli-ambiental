"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/components/Toast";

interface Empreendimento {
  id: number;
  apelido: string;
  cliente: { apelido: string };
}

interface ControleDmr {
  id: number;
  empreendimentoId: number;
  ano: number;
  t1Dmr: string;
  t1Mtr: string;
  t2Dmr: string;
  t2Mtr: string;
  t3Dmr: string;
  t3Mtr: string;
  t4Dmr: string;
  t4Mtr: string;
  empreendimento: Empreendimento;
}

const STATUS_OPTIONS = [
  { value: "", label: "—" },
  { value: "OK", label: "OK" },
  { value: "Pendente", label: "Pendente" },
];

export default function DmrPage() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<ControleDmr[]>([]);
  const [loading, setLoading] = useState(true);
  const [disponiveis, setDisponiveis] = useState<Empreendimento[]>([]);
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === registros.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(registros.map((r) => r.id)));
  };
  const removerSelecionados = async () => {
    if (!confirm(`Remover ${selectedIds.size} empreendimento(s) do controle DMR?`)) return;
    try {
      const res = await fetch(`/api/controle-dmr?ids=${Array.from(selectedIds).join(",")}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao remover");
      setRegistros((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch {
      toast("Erro ao remover registros.", "error");
    }
  };

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/controle-dmr");
    const data = await res.json();
    setRegistros(data);
    setLoading(false);
  }

  async function carregarDisponiveis() {
    const resEmps = await fetch("/api/empreendimentos");
    const emps: Empreendimento[] = await resEmps.json();
    setDisponiveis(emps.filter((e) => !registros.some((r) => r.empreendimentoId === e.id)));
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    carregarDisponiveis();
  }, [registros]);

  async function adicionar() {
    if (!selectedId) return;
    const res = await fetch("/api/controle-dmr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empreendimentoId: Number(selectedId) }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast(data.error || "Erro ao adicionar", "error");
      return;
    }
    setSelectedId("");
    setBusca("");
    await carregar();
  }

  async function atualizarStatus(id: number, campo: string, valor: string) {
    await fetch(`/api/controle-dmr/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });
    setRegistros((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r))
    );
  }

  async function remover(id: number) {
    if (!confirm("Remover este empreendimento do controle DMR?")) return;
    await fetch(`/api/controle-dmr/${id}`, { method: "DELETE" });
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  const filtrados = busca
    ? disponiveis.filter(
        (e) =>
          e.apelido.toLowerCase().includes(busca.toLowerCase()) ||
          e.cliente.apelido.toLowerCase().includes(busca.toLowerCase())
      )
    : disponiveis;

  const trimestres = [
    { key: "t1", label: "1º Trim" },
    { key: "t2", label: "2º Trim" },
    { key: "t3", label: "3º Trim" },
    { key: "t4", label: "4º Trim" },
  ];

  return (
    <div>
      <Topbar title="DMR — Controle Trimestral" subtitle="Gerencie os empreendimentos que precisam de declaração DMR/MTR" />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 mb-6">
        <h2 className="font-display text-base font-semibold mb-3">Adicionar empreendimento ao controle (DMR)</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
            <input
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setSelectedId(""); }}
              placeholder="Buscar empreendimento ou cliente..."
              className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            />
          </div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
          >
            <option value="">Selecione...</option>
            {filtrados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.cliente.apelido} — {e.apelido}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={adicionar}
            disabled={!selectedId}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold">
            Situação — {new Date().getFullYear()}
            <span className="ml-2 text-sm font-normal text-[var(--color-ink-500)]">{registros.length} empreendimento(s)</span>
          </h2>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-ink-500)]">{selectedIds.size} selecionado(s)</span>
              <button
                type="button"
                onClick={removerSelecionados}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <Trash2 size={14} />
                Remover
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-ink-500)]">Carregando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">Nenhum empreendimento cadastrado. Adicione um acima.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                  <th className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={registros.length > 0 && selectedIds.size === registros.length}
                      onChange={toggleSelectAll}
                      className="accent-[var(--color-brand-500)]"
                    />
                  </th>
                  <th className="text-left p-2 font-medium">Empresa</th>
                  <th className="text-left p-2 font-medium">Empreendimento</th>
                  {trimestres.map((t) => (
                    <th key={t.key} className="text-center p-2 font-medium">{t.label}</th>
                  ))}
                  <th className="text-center p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                  {registros.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-paper-50)] hover:bg-[var(--color-paper-50)]">
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="accent-[var(--color-brand-500)]"
                      />
                    </td>
                    <td className="p-2 truncate text-[var(--color-ink-700)]" title={r.empreendimento.cliente.apelido}>
                      {r.empreendimento.cliente.apelido}
                    </td>
                    <td className="p-2 truncate font-medium text-[var(--color-ink-900)]" title={r.empreendimento.apelido}>
                      {r.empreendimento.apelido}
                    </td>
                      {trimestres.map((t) => {
                      const campoDmr = `${t.key}Dmr` as keyof typeof r;
                      const campoMtr = `${t.key}Mtr` as keyof typeof r;
                      const dmrVal = (r[campoDmr] as string) || "";
                      const mtrVal = (r[campoMtr] as string) || "";
                      const ambosOk = dmrVal === "OK" && mtrVal === "OK";
                      const algumPendente = dmrVal === "Pendente" || mtrVal === "Pendente";
                      const combined = ambosOk ? "OK" : algumPendente ? "Pendente" : "";

                      async function alterar(valor: string) {
                        await atualizarStatus(r.id, campoDmr as string, valor);
                        await atualizarStatus(r.id, campoMtr as string, valor);
                      }

                      return (
                        <td key={t.key} className="p-1.5 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <select
                              value={combined}
                              onChange={(e) => alterar(e.target.value)}
                              className={`w-full max-w-[90px] rounded border px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] ${
                                ambosOk ? "border-green-300 bg-green-50" : algumPendente ? "border-amber-300 bg-amber-50" : "border-[var(--color-paper-200)] bg-white"
                              }`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <span className="text-[10px] text-[var(--color-ink-400)]">
                              {dmrVal || "—"}/{mtrVal || "—"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => remover(r.id)}
                        className="text-[var(--color-ink-400)] hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
