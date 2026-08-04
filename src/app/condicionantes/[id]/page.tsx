import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Building2, Calendar, User, AlertTriangle } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { UltimaModificacao } from "@/components/UltimaModificacao";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pendente: "Pendente", em_andamento: "Em Andamento", cumprida: "Cumprida",
  vencida: "Vencida", suspensa: "Suspensa",
};

const statusColors: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-800",
  em_andamento: "bg-blue-50 text-blue-800",
  cumprida: "bg-green-50 text-green-800",
  vencida: "bg-red-50 text-red-800",
  suspensa: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const c = await prisma.condicionante.findUnique({ where: { id: Number(id) } });
  return { title: `Condicionante — ${c?.descricao?.slice(0, 40) || "Não encontrada"}` };
}

export default async function CondicionanteDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const c = await prisma.condicionante.findUnique({
    where: { id: Number(id) },
    include: {
      processo: {
        include: {
          empreendimento: { select: { id: true, apelido: true } },
          orgao: { select: { sigla: true } },
        },
      },
    },
  });
  if (!c) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Condicionantes", href: "/condicionantes" }, { label: c.descricao.slice(0, 40) }]} />
      <Topbar
        title={c.descricao.length > 60 ? c.descricao.slice(0, 60) + "..." : c.descricao}
        subtitle={`Processo ${c.processo.numProtocolo}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/condicionantes/${c.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Editar
            </Link>
            <DeleteButton entity="Condicionante" endpoint={`/api/condicionantes/${c.id}`} redirectTo="/condicionantes" />
          </div>
        }
      />
      <UltimaModificacao entidade="condicionante" entidadeId={c.id} />
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Dados da Condicionante</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <FileText size={16} />
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[c.status] || ""}`}>{statusLabels[c.status] || c.status}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Building2 size={16} />
              <Link href={`/processos/${c.processo.id}`} className="text-[var(--color-brand-600)] hover:underline">{c.processo.numProtocolo} — {c.processo.tipo}</Link>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Building2 size={16} />
              <Link href={`/empreendimentos/${c.processo.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">{c.processo.empreendimento.apelido}</Link>
            </div>
            {c.prazo && (
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Calendar size={16} />
                <span>Prazo: {format(c.prazo, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
            {c.dataCumprimento && (
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Calendar size={16} />
                <span>Cumprida em: {format(c.dataCumprimento, "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
            )}
            {c.responsavel && (
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <User size={16} />
                <span>Responsável: {c.responsavel}</span>
              </div>
            )}
          </div>
        </div>
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Descrição</h2>
          <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{c.descricao}</p>
          {c.observacoes && (
            <>
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mt-4 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Observações
              </h2>
              <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{c.observacoes}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
