"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

interface Cliente {
  id: number;
  apelido: string;
}

export default function NovaCobrancaPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({
    tipoCobranca: "",
    valor: "",
    formaPagamento: "",
    dataVencimento: "",
    descricao: "",
    clienteId: "",
  });
  const [quitado, setQuitado] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then(setClientes)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      ...form,
      valor: parseFloat(form.valor),
      clienteId: Number(form.clienteId),
      dataVencimento: form.dataVencimento ? new Date(form.dataVencimento).toISOString() : undefined,
    };
    if (quitado) {
      body.statusPagamento = "pago";
      body.dataPagamento = new Date().toISOString();
    }
    await fetch("/api/financeiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.push("/financeiro");
    router.refresh();
  }

  const tipoCobrancaOptions = ["Honorários", "Taxas", "Despesas", "Serviços", "Outro"];

  return (
    <div>
      <Topbar title="Nova Cobrança" subtitle="Registre uma nova cobrança" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Tipo de Cobrança</label>
              <select value={form.tipoCobranca} onChange={(e) => setForm({ ...form, tipoCobranca: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="">Selecione...</option>
                {tipoCobrancaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Cliente</label>
              <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required>
                <option value="">Selecione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.apelido}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Valor</label>
              <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Forma de Pagamento</label>
              <input value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Data de Vencimento</label>
              <input type="date" value={form.dataVencimento} onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-ink-700)] cursor-pointer">
            <input type="checkbox" checked={quitado} onChange={(e) => setQuitado(e.target.checked)} className="rounded border-[var(--color-paper-200)] text-[var(--color-brand-500)] focus:ring-[var(--color-brand-500)]" />
            Marcar como quitado (status "pago" com data atual)
          </label>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => router.back()} className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
