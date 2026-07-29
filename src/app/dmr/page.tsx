"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { Plus, Trash2, Search, CheckCircle2, Clock, XCircle, Upload, Loader2 } from "lucide-react";

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

function statusIcon(val: string) {
  const s = val.trim().toLowerCase();
  if (s === "ok") return <CheckCircle2 size={13} className="text-green-600" />;
  if (s === "pendente") return <Clock size={13} className="text-amber-500" />;
  return null;
}

export default function DmrPage() {
  const [registros, setRegistros] = useState<ControleDmr[]>([]);
  const [loading, setLoading] = useState(true);
  const [disponiveis, setDisponiveis] = useState<Empreendimento[]>([]);
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

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

  async function importarPlanilha(file: File) {
    if (!file.name.endsWith(".xlsx")) {
      alert("Selecione um arquivo .xlsx");
      return;
    }
    setImporting(true);
    setImportResult(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const res = await fetch("/api/dmr/import-mtr", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar");
      setImportResult(data.mensagem);
      await carregar();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
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
      alert(data.error || "Erro ao adicionar");
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

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold">Importar planilha</h2>
          <label className="focus-ring transition-brand inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-river-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-river-600)] disabled:opacity-50">
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {importing ? "Importando..." : "Selecionar .xlsx"}
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={importing}
              onChange={(e) => e.target.files?.[0] && importarPlanilha(e.target.files[0])}
            />
          </label>
        </div>
        {importResult && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{importResult}</p>
        )}
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 mb-6">
        <h2 className="font-display text-base font-semibold mb-3">Adicionar empreendimento</h2>
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
        <h2 className="font-display text-base font-semibold mb-4">
          Situação — {new Date().getFullYear()}
          <span className="ml-2 text-sm font-normal text-[var(--color-ink-500)]">{registros.length} empreendimento(s)</span>
        </h2>

        {loading ? (
          <p className="text-sm text-[var(--color-ink-500)]">Carregando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">Nenhum empreendimento cadastrado. Adicione um acima.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
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
                    <td className="p-2 truncate text-[var(--color-ink-700)]" title={r.empreendimento.cliente.apelido}>
                      {r.empreendimento.cliente.apelido}
                    </td>
                    <td className="p-2 truncate font-medium text-[var(--color-ink-900)]" title={r.empreendimento.apelido}>
                      {r.empreendimento.apelido}
                    </td>
                    {trimestres.map((t) => {
                      const campoDmr = `${t.key}Dmr` as keyof typeof r;
                      const campoMtr = `${t.key}Mtr` as keyof typeof r;
                      return (
                        <td key={t.key} className="p-1.5 text-center">
                          <div className="inline-flex items-center gap-1">
                            <select
                              value={r[campoDmr] as string}
                              onChange={(e) => atualizarStatus(r.id, campoDmr as string, e.target.value)}
                              className="w-20 rounded border border-[var(--color-paper-200)] bg-white px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
                              title={`DMR ${t.label}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <span className="text-[var(--color-ink-300)] text-xs">/</span>
                            <select
                              value={r[campoMtr] as string}
                              onChange={(e) => atualizarStatus(r.id, campoMtr as string, e.target.value)}
                              className="w-20 rounded border border-[var(--color-paper-200)] bg-white px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)]"
                              title={`MTR ${t.label}`}
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
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
