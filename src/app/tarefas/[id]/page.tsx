export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, User, Users, Calendar, Clock, AlertTriangle, MessageSquare, Edit3, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  andamento: "Em Andamento",
  aguardando: "Aguardando",
  concluido: "Concluído",
};

const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  andamento: "bg-blue-50 text-blue-600",
  aguardando: "bg-amber-50 text-amber-700",
  concluido: "bg-green-50 text-green-700",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
};

const prioridadeColors: Record<string, string> = {
  baixa: "text-[var(--color-ink-500)]", media: "text-[var(--color-brand-600)]",
  alta: "text-[var(--color-river-700)]", urgente: "text-[var(--color-river-700)]",
};

export async function generateMetadata() {
  return { title: "Tarefa" };
}

export default async function TarefaDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const tarefa = await prisma.tarefa.findUnique({
    where: { id: Number(id) },
    include: {
      responsavel: { select: { nome: true } },
      usuario: { select: { nome: true } },
    },
  });
  if (!tarefa) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Tarefas", href: "/tarefas" }, { label: "Tarefa" }]} />

      <div className="mb-4">
        <Link href="/tarefas" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para tarefas
        </Link>
      </div>

      <Topbar
        title={tarefa.titulo}
        subtitle="Detalhes da tarefa"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/tarefas/${tarefa.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <DeleteButton entity="Tarefa" endpoint={`/api/tarefas/${tarefa.id}`} redirectTo="/tarefas" />
          </div>
        }
      />

      <Tabs
        tabs={[
          {
            key: "informacoes",
            label: "Informações",
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <ClipboardList size={16} />
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[tarefa.status] || ""}`}>{statusLabels[tarefa.status] || tarefa.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <AlertTriangle size={16} />
                    <span className={prioridadeColors[tarefa.prioridade]}>{prioridadeLabels[tarefa.prioridade] || tarefa.prioridade}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <User size={16} />
                    <span>Resp.: {tarefa.responsavel.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Users size={16} />
                    <span>Criador: {tarefa.usuario.nome}</span>
                  </div>
                </div>
              </div>
            ),
          },
          ...(tarefa.descricao
            ? [{
                key: "descricao",
                label: "Descrição",
                content: (
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                    <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Descrição</h2>
                    <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{tarefa.descricao}</p>
                  </div>
                ),
              }]
            : []),
          ...(tarefa.statusObs
            ? [{
                key: "statusObs",
                label: "Observação",
                content: (
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                    <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2 flex items-center gap-2">
                      <MessageSquare size={16} />
                      Observação da mudança de status
                    </h2>
                    <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{tarefa.statusObs}</p>
                  </div>
                ),
              }]
            : []),
          {
            key: "datas",
            label: "Datas",
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Datas</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Calendar size={14} />
                    <span>Criado em {format(tarefa.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  {tarefa.dataVencimento && (
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <Clock size={14} />
                      <span>Vence em {format(tarefa.dataVencimento, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
