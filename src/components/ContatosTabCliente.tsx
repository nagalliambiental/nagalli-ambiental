"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { useToast } from "@/components/Toast";

interface EmpreendimentoOpcao {
  id: number;
  apelido: string;
  unidadeSinir?: string | null;
  cliente?: { apelido: string } | null;
}

interface ContatoData {
  id: number;
  nome: string;
  assunto: string | null;
  email: string | null;
  cargo: string | null;
  telefone: string | null;
  empreendimentoId: number | null;
  clienteId: number | null;
  ativo: boolean;
  criadoEm: string;
  empreendimento?: { id: number; apelido: string; unidadeSinir?: string | null } | null;
}

interface ContatosTabClienteProps {
  empreendimentos: EmpreendimentoOpcao[];
  clienteId: string;
}

export function ContatosTabCliente({ clienteId }: ContatosTabClienteProps) {
  const { toast } = useToast();
  const [contatos, setContatos] = useState<ContatoData[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", assunto: "", email: "", telefone: "" });

  const carregarContatos = useCallback(async (mounted = true) => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/contatos?clienteId=${clienteId}`);
      if (res.ok) {
        const data = await res.json();
        if (mounted) setContatos(data);
      } else if (mounted) {
        toast("Falha ao carregar os contatos", "error");
      }
    } catch {
      if (mounted) toast("Falha ao carregar os contatos", "error");
    } finally {
      if (mounted) setCarregando(false);
    }
  }, [clienteId, toast]);

  useEffect(() => {
    let mounted = true;
    carregarContatos(mounted);
    return () => { mounted = false; };
  }, [carregarContatos]);

  async function adicionar() {
    if (!form.nome.trim()) {
      toast("Nome do contato e obrigatorio", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          assunto: form.assunto.trim() || null,
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          clienteId: clienteId ? Number(clienteId) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao salvar o contato", "error");
        return;
      }
      toast("Contato cadastrado", "success");
      setForm({ nome: "", assunto: "", email: "", telefone: "" });
      carregarContatos();
    } catch {
      toast("Falha ao salvar o contato", "error");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(c: ContatoData) {
    if (!confirm(`Remover o contato ${c.nome}?`)) return;
    try {
      const res = await fetch(`/api/contatos/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error || "Falha ao remover o contato", "error");
        return;
      }
      toast("Contato removido", "success");
      carregarContatos();
    } catch {
      toast("Falha ao remover o contato", "error");
    }
  }

  const inputCls = "rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="flex items-center gap-2 text-[var(--color-brand-600)] mb-2">
          <Users size={20} />
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Contatos do cliente</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">
          Cadastre os contatos deste cliente. Eles serao usados nos MTRs dos empreendimentos do cliente.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <input
            placeholder="Nome *"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="Assunto / Setor"
            value={form.assunto}
            onChange={(e) => setForm((f) => ({ ...f, assunto: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
      </div>

      <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-paper-50)]">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Nome</th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Assunto</th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Email</th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Telefone</th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-500)]">Acoes</th>
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
                  Nenhum contato cadastrado para este cliente.
                </td>
              </tr>
            ) : (
              contatos.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-paper-100)]">
                  <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{c.nome}</td>
                  <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.assunto || "\u2014"}</td>
                  <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.email || "\u2014"}</td>
                  <td className="px-4 py-2.5 text-[var(--color-ink-700)]">{c.telefone || "\u2014"}</td>
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
    </div>
  );
}
