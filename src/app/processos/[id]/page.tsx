import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Building2, Map, Calendar, Users, ClipboardList, FileCheck2, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado",
  em_andamento: "Em Andamento",
  exigencia_recebida: "Exigência Recebida",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado",
};

const statusColors: Record<string, string> = {
  protocolado: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  em_andamento: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  exigencia_recebida: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  deferido: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  indeferido: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  arquivado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export default async function ProcessoDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const processo = await prisma.processo.findUnique({
    where: { id: Number(id) },
    include: {
      orgao: true,
      empreendimento: { select: { apelido: true, id: true, cliente: { select: { apelido: true } } } },
      responsavel: { select: { nome: true } },
      _count: { select: { exigencias: true, documentos: true } },
    },
  });
  if (!processo) notFound();

  return (
    <div>
      <Topbar title={`Processo ${processo.numProtocolo}`} subtitle={processo.tipo} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <FileText size={16} />
                <span className="font-mono text-[var(--color-ink-900)]">{processo.numProtocolo}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Building2 size={16} />
                <span>{processo.orgao.sigla}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Map size={16} />
                <Link href={`/empreendimentos/${processo.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">{processo.empreendimento.apelido}</Link>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Users size={16} />
                <span>{processo.empreendimento.cliente.apelido}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <ClipboardList size={16} />
                <span>Sistema: {processo.sistema}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <FileCheck2 size={16} />
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[processo.status] || ""}`}>{statusLabels[processo.status] || processo.status}</span>
              </div>
            </div>
          </div>

          {processo.observacoes && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Observações</h2>
              <p className="text-sm text-[var(--color-ink-700)]">{processo.observacoes}</p>
            </div>
          )}

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Itens vinculados</h2>
            <div className="space-y-2 text-sm">
              <Link href={`/exigencias?processoId=${processo.id}`} className="block text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
                {processo._count.exigencias} exigência(s) →
              </Link>
              <Link href={`/documentos?processoId=${processo.id}`} className="block text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
                {processo._count.documentos} documento(s) →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Prazos</h2>
            <div className="space-y-3 text-sm">
              {processo.validade && (
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Clock size={14} />
                  <span>Validade: {format(processo.validade, "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-[var(--color-ink-500)]">Criado em</span><span>{format(processo.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span></div>
            </div>
          </div>

          {processo.responsavel && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Responsável</h2>
              <p className="text-sm text-[var(--color-ink-700)]">{processo.responsavel.nome}</p>
            </div>
          )}

          <Link href="/processos" className="focus-ring transition-brand block rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
