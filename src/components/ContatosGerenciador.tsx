"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface ClienteComEmpreendimentos {
  id: number;
  apelido: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  _count: { empreendimentos: number };
  empreendimentos: {
    id: number;
    apelido: string;
    unidadeSinir?: string | null;
  }[];
}

interface ContatoEmpreendimento {
  id: number;
  nome: string;
  email: string;
  cargo: string | null;
  telefone: string | null;
  empreendimentoId: number;
  ativo: boolean;
  criadoEm: string;
}

export function ContatosGerenciador({ clientes }: { clientes: ClienteComEmpreendimentos[] }) {
  const { toast } = useToast();
  const [clienteId, setClienteId] = useState("");
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [contatos, setContatos] = useState<ContatoEmpreendimento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", cargo: "", telefone: "" });

  const empreendimentosDoCliente = clienteId
    ? clientes.find((c) => c.id === Number(clienteId))?.empreendimentos || []
    : [];

  

  useEffect(() => {
    let mounted = true;
    const carregar = async () => {
      if (!empreendimentoId) {
        if (mounted) setContatos([]);
        return;
      }
      setCarregando(true);
      try {
        const res = await fetch(`/api/contatos?empreendimentoId=${empreendimentoId}`);
        if (res.ok && mounted) setContatos(await res.json());
        else if (mounted) toast("Falha ao carregar os contatos", "error");
      } catch {
        if (mounted) toast("Falha ao carregar os contatos", "error");
      } finally {
        if (mounted) setCarregando(false);
      }
    };
    carregar();
    return () => { mounted = false; };
  }, [empreendimentoId, toast]);

  const trocarCliente = (id: string) => {
    setClienteId(id);
    setEmpreendimentoId("");
    setContatos([]);
  };

  const trocarEmpreendimento = (id: string) => {
    setEmpreendimentoId(id);
  };

  const recarregarContatos = async () => {
    if (!empreendimentoId) {
      setContatos([]);
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch(`/api/contatos?empreendimentoId=${empreendimentoId}`);
      if (res.ok) setContatos(await res.json());
      else toast("Falha ao carregar os contatos", "error");
    } catch {
      toast("Falha ao carregar os contatos", "error");
    } finally {
      setCarregando(false);
    }
  };

  async function adicionar() {
    if (!empreendimentoId) {
      toast("Selecione um empreendimento", "error");
      return;
    }
    if (!form.nome.trim() || !form.email.trim()) {
      toast("Informe nome e e-mail do contato", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, empreendimentoId: Number(empreendimentoId) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao salvar o contato", "error");
        return;
      }
      toast("Contato cadastrado", "success");
      setForm({ nome: "", email: "", cargo: "", telefone: "" });
      await recarregarContatos();
    } catch {
      toast("Falha ao salvar o contato", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c: ContatoEmpreendimento) {
    if (!confirm(`Remover o contato ${c.nome} (${c.email})?`)) return;
    try {
      const res = await fetch(`/api/contatos/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao remover o contato", "error");
        return;
      }
      toast("Contato removido", "success");
      await recarregarContatos();
    } catch {
      toast("Falha ao remover o contato", "error");
    }
  }

  const inputCls = "rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="flex items-center gap-2 text-[var(--color-brand-600)] mb-2">
          <Building2 size={20} />
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Contatos por empreendimento</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">
          Cadastre pessoas específicas de cada empreendimento para receber notificações de MTRs pendentes.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => trocarCliente(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apelido} ({c.razaoSocial})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Empreendimento</label>
            <select
              value={empreendimentoId}
              onChange={(e) => trocarEmpreendimento(e.target.value)}
              disabled={!clienteId || empreendimentosDoCliente.length === 0}
              className="w-full rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Selecione um empreendimento...</option>
              {empreendimentosDoCliente.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.apelido}{e.unidadeSinir ? ` · unid. ${e.unidadeSinir}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {empreendimentoId && (
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            <input
              placeholder="Nome *"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className={inputCls}
            />
            <input
              placeholder="E-mail *"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls}
            />
            <input
              placeholder="Cargo"
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              className={inputCls}
            />
            <input
              placeholder="Telefone"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              className={inputCls}
            />
            <button
              onClick={adicionar}
              disabled={salvando}
              className="focus-ring transition-brand flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
            >
              {salvando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Adicionar
            </button>
          </div>
        )}
      </div>

      {empreendimentoId && (
        <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-paper-50)]">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Nome</th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Cargo</th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">E-mail</th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Telefone</th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-500)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-ink-500)]">
                    <Loader2 size={16} className="mr-2 inline animate-spin" /> Carregando...
                  </td>
                </tr>
              ) : contatos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-ink-500)]">
                    Nenhum contato cadastrado para este empreendimento.
                  </td>
                </tr>
              ) : (
                contatos.map((c) => (
                  <tr key={c.id} className="border-t border-[var(--color-paper-100)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{c.nome}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.cargo || "—"}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.email}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.telefone || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => excluir(c)}
                        title="Remover contato"
                        className="rounded-md p-1.5 text-[var(--color-ink-600)] hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}