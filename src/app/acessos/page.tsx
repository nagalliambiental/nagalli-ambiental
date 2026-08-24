"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { Loader2, Plus, Trash2, Key, Link as LinkIcon, Building2, KeyRound } from "lucide-react";
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

export default function AcessosPage() {
  const { toast } = useToast();
  const [acessos, setAcessos] = useState<AcessoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string>("");

  const [showModal, setShowModal] = useState(false);
  const [formLogin, setFormLogin] = useState("");
  const [formSenha, setFormSenha] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formClienteId, setFormClienteId] = useState("");
  const [formEmpId, setFormEmpId] = useState("");
  const [clientes, setClientes] = useState<{ id: number; apelido: string }[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<{ id: number; apelido: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAcessos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (tipo) params.set("tipo", tipo);
      const res = await fetch(`/api/acessos?${params}`);
      const data = await res.json();
      setAcessos(data);
    } catch {
      setAcessos([]);
    } finally {
      setLoading(false);
    }
  }, [search, tipo]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (tipo) params.set("tipo", tipo);
      try {
        const res = await fetch(`/api/acessos?${params}`, { signal: controller.signal });
        const data = await res.json();
        setAcessos(data);
      } catch {
        if (!controller.signal.aborted) setAcessos([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [search, tipo]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/clientes?limit=999", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (!controller.signal.aborted) setClientes(Array.isArray(d) ? d : d.data ?? []); })
      .catch(() => { if (!controller.signal.aborted) setClientes([]); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!formClienteId) return;
    const controller = new AbortController();
    fetch(`/api/empreendimentos?clienteId=${formClienteId}&limit=999`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => { if (!controller.signal.aborted) setEmpreendimentos(Array.isArray(d) ? d : d.data ?? []); })
      .catch(() => { if (!controller.signal.aborted) setEmpreendimentos([]); });
    return () => controller.abort();
  }, [formClienteId]);

  async function handleCreate() {
    if (!formLogin.trim() || !formSenha.trim() || !formDescricao.trim()) {
      toast("Preencha login, senha e descrição", "error"); return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { login: formLogin, senha: formSenha, descricao: formDescricao };
      const cid = Number(formClienteId);
      if (cid) body.clienteId = cid;
      const eid = Number(formEmpId);
      if (eid) body.empreendimentoId = eid;
      const res = await fetch("/api/acessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setFormLogin(""); setFormSenha(""); setFormDescricao("");
      setFormClienteId(""); setFormEmpId("");
      setShowModal(false);
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

  const gerais = acessos.filter((a) => !a.clienteId);
  const vinculados = acessos.filter((a) => a.clienteId);

  return (
    <div>
      <Topbar
        icon={KeyRound}
        title="Acessos"
        subtitle="Gerencie logins e senhas"
        actions={
          <div className="flex items-center gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por login ou descrição..."
              className="w-72 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}
              className="rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
            >
              <option value="">Todos</option>
              <option value="geral">Acesso PJ</option>
              <option value="vinculado">Acesso Empreendimentos</option>
            </select>
            <button onClick={() => setShowModal(true)}
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} /> Novo Acesso
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[var(--color-brand-500)]" /></div>
      ) : (
        <div className="space-y-8">
          <Section title="Acessos PJ" icon={Key} acessos={gerais} onDelete={handleDelete} />
          <Section title="Acessos Empreendimentos" icon={Building2} acessos={vinculados} onDelete={handleDelete} />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Novo Acesso</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Login</label>
                <input value={formLogin} onChange={(e) => setFormLogin(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Senha</label>
                <input type="password" value={formSenha} onChange={(e) => setFormSenha(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Descrição</label>
                <input value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} placeholder="Ex: Portal da Prefeitura, Sistema XYZ..."
                  className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Vincular a cliente <span className="text-[var(--color-ink-400)] font-normal">(opcional)</span></label>
                <select value={formClienteId} onChange={(e) => { setFormClienteId(e.target.value); setFormEmpId(""); setEmpreendimentos([]); }}
                  className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                >
                  <option value="">Nenhum</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.apelido}</option>
                  ))}
                </select>
              </div>
              {formClienteId && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Vincular a empreendimento <span className="text-[var(--color-ink-400)] font-normal">(opcional)</span></label>
                  <select value={formEmpId} onChange={(e) => setFormEmpId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  >
                    <option value="">Nenhum</option>
                    {empreendimentos.map((e) => (
                      <option key={e.id} value={e.id}>{e.apelido}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setFormClienteId(""); setFormEmpId(""); setEmpreendimentos([]); }} className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">Cancelar</button>
              <button onClick={handleCreate} disabled={saving}
                className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? "Salvando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, acessos, onDelete }: { title: string; icon: React.ElementType; acessos: AcessoEntry[]; onDelete: (id: number) => void }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3 flex items-center gap-2">
        <Icon size={18} className="text-[var(--color-brand-500)]" /> {title}
        <span className="text-xs font-normal text-[var(--color-ink-500)]">({acessos.length})</span>
      </h2>
      {acessos.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)] py-4">Nenhum acesso encontrado.</p>
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
                  {a.cliente && (
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-ink-500)]">
                      <span className="flex items-center gap-1"><Building2 size={12} />{a.cliente.apelido}</span>
                      {a.empreendimento && <span className="flex items-center gap-1"><LinkIcon size={12} />{a.empreendimento.apelido}</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => onDelete(a.id)} className="shrink-0 text-[var(--color-ink-300)] hover:text-red-500">
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
