export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ehPrivilegiado } from "@/lib/perfil";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateTime } from "@/lib/format";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  Users,
  Mail,
  ShieldCheck,
  CreditCard,
  ScrollText,
  CheckCircle2,
  XCircle,
  CalendarClock,
  UserCheck,
  Edit3,
  ArrowLeft,
  Activity,
} from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Tabs } from "@/components/Tabs";
import { UltimaModificacao } from "@/components/UltimaModificacao";

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

const acaoLabels: Record<string, string> = {
  criar: "Criou",
  CRIAR: "Criou",
  VISUALIZAR: "Visualizou",
  ATUALIZAR: "Atualizou",
  EXCLUIR: "Excluiu",
};

function formatCPF(value?: string | null) {
  if (!value) return null;
  const d = value.replace(/\D/g, "");
  if (d.length !== 11) return value;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const usuario = await prisma.usuario.findUnique({
    where: { id: Number(id) },
    select: { nome: true },
  });
  return { title: usuario?.nome ? `Usuário - ${usuario.nome}` : "Usuário" };
}

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

  const logs = await prisma.logAuditoria.findMany({
    where: { usuarioId: usuario.id },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });

  const privilegiado = ehPrivilegiado((session.user as Record<string, unknown>)?.perfil as string);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Usuários", href: "/usuarios" }, { label: usuario.nome }]} />

      <div className="mb-4">
        <Link href="/usuarios" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para usuários
        </Link>
      </div>

      <Topbar
        icon={Users}
        title={usuario.nome}
        subtitle={usuario.email}
        actions={
          privilegiado ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/usuarios/${usuario.id}/editar`}
                className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              >
                <Edit3 size={14} />
                Editar
              </Link>
              <DeleteButton entity="Usuário" endpoint={`/api/usuarios/${usuario.id}`} redirectTo="/usuarios" />
            </div>
          ) : undefined
        }
      />

      <UltimaModificacao entidade="usuario" entidadeId={usuario.id} />

      <Tabs
        tabs={[
          {
            key: "informacoes",
            label: "Informações",
            content: (
              <div className="space-y-6">
                <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                  <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <ShieldCheck size={16} />
                      <span>Perfil:</span>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${perfilColors[usuario.perfil] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                        {perfilLabels[usuario.perfil] || usuario.perfil}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      {usuario.ativo ? (
                        <>
                          <CheckCircle2 size={16} className="text-[var(--color-brand-600)]" />
                          <span>Status: Ativo</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-[var(--color-river-700)]" />
                          <span>Status: Inativo</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <Mail size={16} />
                      <span className="truncate" title={usuario.email}>{usuario.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <CreditCard size={16} />
                      <span>CPF: {formatCPF(usuario.cpf) || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <ScrollText size={16} />
                      <span>Conselho: {usuario.conselho || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <CalendarClock size={16} />
                      <span>Criado em: {format(usuario.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    {usuario.termosAceitosEm && (
                      <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                        <UserCheck size={16} />
                        <span>Termos aceitos em: {format(usuario.termosAceitosEm, "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 text-sm">
                    <p className="text-[var(--color-ink-500)]">Tarefas</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink-900)]">{usuario._count.tarefas}</p>
                  </div>
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 text-sm">
                    <p className="text-[var(--color-ink-500)]">Ações de auditoria</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink-900)]">{usuario._count.logs}</p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "atividade",
            label: "Atividade",
            count: logs.length,
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4 flex items-center gap-2">
                  <Activity size={16} />
                  Últimas ações
                </h2>
                {logs.length > 0 ? (
                  <div className="divide-y divide-[var(--color-paper-200)]">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-[var(--color-ink-900)]">
                            {acaoLabels[log.acao] || log.acao}{" "}
                            <span className="font-normal text-[var(--color-ink-500)]">
                              {log.entidade.toLowerCase()}
                              {log.dados ? ` — ${String(log.dados).slice(0, 120)}${String(log.dados).length > 120 ? "…" : ""}` : ""}
                            </span>
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--color-ink-500)]">{formatDateTime(log.criadoEm)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-ink-500)]">Nenhuma ação registrada para este usuário.</p>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}