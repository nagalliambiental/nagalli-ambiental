import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Shield, Check, X, Calendar, ClipboardList } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

export default async function UsuarioDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    include: {
      _count: { select: { tarefas: true, logs: true } },
    },
  });

  if (!usuario) notFound();

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
                <Shield size={16} />
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${perfilColors[usuario.perfil] || ""}`}>
                  {perfilLabels[usuario.perfil] || usuario.perfil}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Calendar size={16} />
                <span>Cadastro em {format(usuario.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                {usuario.ativo ? <Check size={16} className="text-[var(--color-brand-600)]" /> : <X size={16} className="text-[var(--color-river-700)]" />}
                <span>{usuario.ativo ? "Ativo" : "Inativo"}</span>
              </div>
            </div>
          </div>

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-[var(--color-ink-500)]" />
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Tarefas</h2>
            </div>
            <p className="text-sm text-[var(--color-ink-500)]">
              {usuario._count.tarefas} tarefa(s) vinculada(s) a este usuário.
            </p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
