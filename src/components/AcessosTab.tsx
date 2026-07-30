"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, Key, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/components/Toast";

interface AcessoEntry {
  id: number;
  login: string;
  senha: string;
  descricao: string;
  clienteId: number | null;
  empreendimentoId: number | null;
  criadoEm: string;
  cliente: { apelido: string } | null;
  empreendimento: { apelido: string } | null;
}

interface EmpreendimentoOption {
  id: number;
  apelido: string;
}

interface Props {
  clienteId: number;
  empreendimentos: EmpreendimentoOption[];
}

export function AcessosTab({ clienteId, empreendimentos }: Props) {
  const { toast } = useToast();
  const [acessos, setAcessos] = useState<AcessoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formLogin, setFormLogin] = useState("");
  const [formSenha, setFormSenha] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formEmpId, setFormEmpId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAcessos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ clienteId: String(clienteId) });
      if (search) params.set("q", search);
      const res = await fetch(`/api/acessos?${params}`);
      const data = await res.json();
      setAcessos(data);
    } catch {
      setAcessos([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId, search]);

  useEffect(() => { fetchAcessos(); }, [fetchAcessos]);

  async function handleCreate() {
    if (!formLogin.trim() || !formSenha.trim() || !formDescricao.trim()) {
      toast("Preencha login, senha e descrição", "error"); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        login: formLogin, senha: formSenha, descricao: formDescricao, clienteId,
      };
      const empId = Number(formEmpId);
      if (empId) body.empreendimentoId = empId;

      const res = await fetch("/api/acessos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setFormLogin(""); setFormSenha(""); setFormDescricao(""); setFormEmpId("");
      setShowForm(false);
      toast("Acesso criado", "success");
      fetchAcessos();
    } catch {
      toast("Erro ao criar acesso", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remover este acesso?")) return;
    try {
      await fetch(`/api/acessos?id=${id}`, { method: "DELETE" });
      toast("Acesso removido", "success");
      fetchAcessos();
    } catch {
      toast("Erro ao remover", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar acesso..."
          className="w-72 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
        <button onClick={() => setShowForm(!showForm)}
          className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
          <Plus size={14} /> {showForm ? "Cancelar" : "Novo Acesso"}
        </button>
      </div>

      {showForm && (
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-600)] mb-1">Login</label>
              <input value={formLogin} onChange={(e) => setFormLogin(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink-600)] mb-1">Senha</label>
              <input type="password" value={formSenha} onChange={(e) => setFormSenha(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-ink-600)] mb-1">Descrição</label>
            <input value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Ex: Portal da Prefeitura..."
              className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-ink-600)] mb-1">Vincular a empreendimento (opcional)</label>
            <select value={formEmpId} onChange={(e) => setFormEmpId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="">Nenhum</option>
              {empreendimentos.map((e) => (
                <option key={e.id} value={e.id}>{e.apelido}</option>
              ))}
            </select>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[var(--color-brand-500)]" /></div>
      ) : acessos.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)] text-center py-8">Nenhum acesso vinculado a este cliente.</p>
      ) : (
        <div className="grid gap-3">
          {acessos.map((a) => (
            <div key={a.id} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-[var(--color-brand-500)]" />
                    <span className="font-medium text-sm text-[var(--color-ink-900)]">{a.login}</span>
                    <span className="text-xs text-[var(--color-ink-400)] font-mono">{a.senha}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-ink-600)]">{a.descricao}</p>
                  {a.empreendimento && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-ink-500)]">
                      <LinkIcon size={12} /> {a.empreendimento.apelido}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(a.id)} className="shrink-0 text-[var(--color-ink-300)] hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
