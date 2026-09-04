"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

export function ContatosTabCliente({ empreendimentos, clienteId }: ContatosTabClienteProps) {
  const { toast } = useToast();
  const [contatos, setContatos] = useState<ContatoData[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [linhas, setLinhas] = useState<{ key: number; nome: string; assunto: string; email: string; telefone: string }[]>([]);
  let keySeq = 0;

  const carregarContatos = useCallback(async (mounted = true) => {
    if (!clienteId) { setContatos([]); return; }
    setCarregando(true);
    try {
      const res = await fetch(`/api/contatos?clienteId=${clienteId}`);
      if (res.ok) {
        const data = await res.json();
        if (mounted) setContatos(data);
      } else if (mounted) toast("Falha ao carregar os contatos", "error");
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

  function adicionarLinha() {
    setLinhas((prev) => [...prev, { key: ++keySeq, nome: "", assunto: "", email: "", telefone: "" }]);
  }

  function removerLinha(key: number) {
    setLinhas((prev) => prev.filter((l) => l.key !== key));
  }

  function atualizarLinha(key: number, campo: string, valor: string) {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  }

  async function salvarLinha(idx: number) {
    const l = linhas[idx];
    if (!l.nome.trim()) {
      toast("Nome do contato e obrigatorio", "error");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/contatos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: l.nome.trim(),
          assunto: l.assunto.trim() || null,
          email: l.email.trim() || null,
          telefone: l.telefone.trim() || null,
          clienteId: clienteId ? Number(clienteId) : undefined,
          empreendimentoId: empreendimentoId ? Number(empreendimentoId) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao salvar contato", "error");
        return;
      }
      toast("Contato salvo", "success");
      setLinhas((prev) => prev.filter((_, i) => i !== idx));
      carregarContatos();
    } catch {
      toast("Falha ao salvar contato", "error");
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--color-brand-600)]">
            <Users size={20} />
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Contatos do cliente</h2>
          </div>
          <button
            onClick={adicionarLinha}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={15} />
            Adicionar contato
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">
          Cadastre os contatos deste cliente. Eles serao usados nos MTRs dos empreendimentos.
        </p>

        {empreendimentos.length > 0 && (
          <div className="mt-3 max-w-xs">
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Vincular a empreendimento (opcional)</label>
            <select
              value={empreendimentoId}
              onChange={(e) => setEmpreendimentoId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-paper-200)] px-2.5 py-2 text-sm"
            >
              <option value="">Sem vinculo especifico...</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.apelido}{e.unidadeSinir ? ` · unid. ${e.unidadeSinir}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {linhas.length > 0 && (
          <div className="mt-4 space-y-2">
            {linhas.map((l, idx) => (
              <div key={l.key} className="flex items-end gap-2 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Nome *</label>
                  <input
                    placeholder="Nome do contato"
                    value={l.nome}
                    onChange={(e) => atualizarLinha(l.key, "nome", e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Assunto *</label>
                  <input
                    placeholder="Assunto / Setor"
                    value={l.assunto}
                    onChange={(e) => atualizarLinha(l.key, "assunto", e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Email</label>
                  <input
                    placeholder="email@exemplo.com"
                    type="email"
                    value={l.email}
                    onChange={(e) => atualizarLinha(l.key, "email", e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Telefone</label>
                  <input
                    placeholder="(00) 00000-0000"
                    value={l.telefone}
                    onChange={(e) => atualizarLinha(l.key, "telefone", e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-2.5 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-1 shrink-0 pb-0.5">
                  <button
                    onClick={() => salvarLinha(idx)}
                    disabled={salvando || !l.nome.trim()}
                    title="Salvar contato"
                    className="focus-ring transition-brand rounded-lg bg-[var(--color-brand-500)] p-2 text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                  >
                    {salvando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  </button>
                  <button
                    onClick={() => removerLinha(l.key)}
                    title="Remover linha"
                    className="rounded-lg p-2 text-[var(--color-ink-500)] hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {linhas.length === 0 && (
          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-[var(--color-ink-400)]">
            <Users size={24} />
            <p className="text-sm">Nenhum contato adicionado.</p>
            <p className="text-xs">Clique em &quot;Adicionar contato&quot; para comecar.</p>
          </div>
        )}
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
