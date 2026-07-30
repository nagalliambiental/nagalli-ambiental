"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Shield, Check, Calendar, ClipboardList, UserCheck, Award, Save, Loader2, Trash2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

const perfilLabels: Record<string, string> = {
  socio: "Sócio",
  tecnico: "Técnico",
  admin: "Administrador",
};

const perfilColors: Record<string, string> = {
  socio: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  tecnico: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  admin: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
};

interface UsuarioData {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  cpf: string | null;
  conselho: string | null;
  criadoEm: string;
  _count: { tarefas: number; logs: number };
}

export default function UsuarioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [usuario, setUsuario] = useState<UsuarioData | null>(null);
  const [perfil, setPerfil] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [cpf, setCpf] = useState("");
  const [conselho, setConselho] = useState("");
  const [saving, setSaving] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [resettingPass, setResettingPass] = useState(false);
  const [passMsg, setPassMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/usuarios/${params.id}`)
      .then((r) => r.json())
      .then((data: UsuarioData) => {
        setUsuario(data);
        setPerfil(data.perfil);
        setAtivo(data.ativo);
        setCpf(data.cpf || "");
        setConselho(data.conselho || "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/usuarios/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perfil, ativo, cpf, conselho }),
    });
    setSaving(false);
    router.refresh();
  }

  async function handleResetPassword() {
    if (novaSenha.length < 4) { setPassMsg("Mínimo 4 caracteres"); return; }
    if (novaSenha !== confirmarSenha) { setPassMsg("Senhas não conferem"); return; }
    setResettingPass(true);
    setPassMsg("");
    const res = await fetch(`/api/usuarios/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: novaSenha }),
    });
    setResettingPass(false);
    if (!res.ok) { setPassMsg("Erro ao redefinir senha"); return; }
    setPassMsg("Senha redefinida com sucesso!");
    setNovaSenha("");
    setConfirmarSenha("");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/usuarios/${params.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Erro ao excluir usuário", "error");
        setDeleting(false);
        return;
      }
      toast("Usuário excluído com sucesso", "success");
      router.push("/usuarios");
      router.refresh();
    } catch {
      toast("Erro ao excluir usuário", "error");
      setDeleting(false);
    }
  }

  if (!loaded) return null;
  if (!usuario) return <p className="p-8 text-sm text-[var(--color-ink-500)]">Usuário não encontrado</p>;

  const hasChanges = perfil !== usuario.perfil || ativo !== usuario.ativo || cpf !== (usuario.cpf || "") || conselho !== (usuario.conselho || "");

  return (
    <div>
      <Topbar title={usuario.nome} subtitle="Detalhes do usuário" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Mail size={16} />
                <span>{usuario.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Calendar size={16} />
                <span>Cadastro em {format(new Date(usuario.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          </div>

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-[var(--color-ink-500)]" />
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Tarefas</h2>
            </div>
            <p className="text-sm text-[var(--color-ink-500)]">{usuario._count.tarefas} tarefa(s) vinculada(s) a este usuário.</p>
            <Link href="/tarefas" className="focus-ring transition-brand mt-3 inline-flex text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
              Ver todas as tarefas →
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Resumo</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-500)]">Tarefas</span>
                <span className="font-medium text-[var(--color-ink-900)]">{usuario._count.tarefas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-ink-500)]">Registros de auditoria</span>
                <span className="font-medium text-[var(--color-ink-900)]">{usuario._count.logs}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/usuarios" className="focus-ring transition-brand flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Voltar
            </Link>
            <button
              onClick={() => setConfirmDelete(true)}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Editar Usuário</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Cargo</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="socio">Sócio</option>
              <option value="tecnico">Técnico</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Ativo</label>
            <select value={ativo ? "true" : "false"} onChange={(e) => setAtivo(e.target.value === "true")} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">CPF</label>
            <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Conselho</label>
            <input value={conselho} onChange={(e) => setConselho(e.target.value)} placeholder="CRBio, CREA, OAB..." className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
        </div>
        {hasChanges && (
          <div className="mt-4">
            <button onClick={handleSave} disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar alterações</>}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Redefinir Senha</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nova Senha</label>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} minLength={4} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Confirmar Senha</label>
            <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
          </div>
        </div>
        {passMsg && (
          <div className={`mt-3 text-sm ${passMsg.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
            {passMsg}
          </div>
        )}
        <div className="mt-4">
          <button onClick={handleResetPassword} disabled={resettingPass || !novaSenha} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-river-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-river-600)] disabled:opacity-50">
            {resettingPass ? <><Loader2 size={16} className="animate-spin" /> Redefinindo...</> : <>Redefinir Senha</>}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Excluir Usuário</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">Tem certeza? Esta ação não pode ser desfeita.</p>
              </div>
              <button onClick={() => setConfirmDelete(false)} className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]" disabled={deleting}>
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
