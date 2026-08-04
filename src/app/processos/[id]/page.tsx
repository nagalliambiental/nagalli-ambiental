export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Building2, Map, Calendar, Users, ClipboardList, FileCheck2, Clock, AlertTriangle, Edit3, ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Tabs } from "@/components/Tabs";
import { UltimaModificacao } from "@/components/UltimaModificacao";
import CompensacaoCorteCard from "@/components/CompensacaoCorteCard";

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

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const processo = await prisma.processo.findUnique({ where: { id: Number(id) } });
  return { title: `Processo - ${processo?.numProtocolo || "Não encontrado"}` };
}

export default async function ProcessoDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const processo = await prisma.processo.findUnique({
    where: { id: Number(id) },
    include: {
      orgao: true,
      empreendimento: { select: { apelido: true, id: true, cliente: { select: { apelido: true } } } },
      responsavel: { select: { nome: true, email: true, telefone: true } },
      _count: { select: { exigencias: true, documentos: true, condicionantesReg: true } },
      condicionantesReg: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!processo) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Processos", href: "/processos" }, { label: processo.numProtocolo }]} />

      <div className="mb-4">
        <Link href="/processos" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para processos
        </Link>
      </div>

      <Topbar
        title={`Processo ${processo.numProtocolo}`}
        subtitle={processo.tipo}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/processos/${processo.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <DeleteButton entity="Processo" endpoint={`/api/processos/${processo.id}`} redirectTo="/processos" />
            <a
              href={`/api/processos/${processo.id}/relatorio-condicionantes`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-river-200)] bg-[var(--color-river-50)] px-3 py-2 text-sm font-medium text-[var(--color-river-700)] hover:bg-[var(--color-river-100)]"
            >
              <FileText size={14} />
              Relatório de condicionantes
            </a>
          </div>
        }
      />

      <UltimaModificacao entidade="processo" entidadeId={processo.id} />

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
                    {processo.numLicenca && (
                      <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                        <FileText size={16} />
                        <span>Licença: {processo.numLicenca}</span>
                      </div>
                    )}
                    {processo.dataProtocolo && (
                      <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                        <Calendar size={16} />
                        <span>Data Protocolo: {format(processo.dataProtocolo, "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                    {processo.dataContato && (
                      <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                        <Calendar size={16} />
                        <span>Data Contato: {format(processo.dataContato, "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {processo.observacoes && (
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                    <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2 flex items-center gap-2">
                      <MessageSquare size={16} />
                      Observações
                    </h2>
                    <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{processo.observacoes}</p>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "prazos",
            label: "Prazos",
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Prazos</h2>
                <div className="space-y-3 text-sm">
                  {processo.validade && (
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <Clock size={14} />
                      <span>Validade: {format(processo.validade, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <AlertTriangle size={14} />
                    <span>Alerta: {processo.alertaDias} dias antes do vencimento</span>
                  </div>
                  <div className="flex justify-between"><span className="text-[var(--color-ink-500)]">Criado em</span><span>{format(processo.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span></div>
                </div>
              </div>
            ),
          },
          {
            key: "responsavel",
            label: "Responsável",
            content: processo.responsavel ? (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Responsável</h2>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-[var(--color-ink-900)]">{processo.responsavel.nome}</p>
                  {processo.responsavel.email && (
                    <p className="text-[var(--color-ink-500)]">Email: {processo.responsavel.email}</p>
                  )}
                  {processo.responsavel.telefone && (
                    <p className="text-[var(--color-ink-500)]">Telefone: {processo.responsavel.telefone}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <p className="text-sm text-[var(--color-ink-500)]">Nenhum responsável vinculado.</p>
              </div>
            ),
          },
          {
            key: "condicionantes",
            label: "Condicionantes",
            count: processo._count.condicionantesReg,
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Condicionantes</h2>
                  <Link href={`/condicionantes/novo?processoId=${processo.id}`} className="text-sm font-medium text-[var(--color-brand-600)] hover:underline">+ Adicionar</Link>
                </div>
                {processo.condicionantesReg.length > 0 ? (
                  <div className="space-y-3">
                    {processo.condicionantesReg.map((c) => (
                      <Link key={c.id} href={`/condicionantes/${c.id}`} className="block border border-[var(--color-paper-200)] rounded-lg p-3 hover:bg-[var(--color-paper-50)] transition-brand">
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-[var(--color-ink-700)] line-clamp-2">{c.descricao}</p>
                          <span className={`ml-2 shrink-0 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            c.status === "cumprida" ? "bg-green-50 text-green-800" :
                            c.status === "vencida" ? "bg-red-50 text-red-800" :
                            c.status === "em_andamento" ? "bg-blue-50 text-blue-800" :
                            "bg-amber-50 text-amber-800"
                          }`}>
                            {c.status === "pendente" ? "Pendente" : c.status === "em_andamento" ? "Em Andamento" : c.status === "cumprida" ? "Cumprida" : c.status === "vencida" ? "Vencida" : "Suspensa"}
                          </span>
                        </div>
                        {c.prazo && <p className="text-xs text-[var(--color-ink-500)] mt-1">Prazo: {format(new Date(c.prazo), "dd/MM/yyyy", { locale: ptBR })}</p>}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-ink-500)]">Nenhuma condicionante registrada.</p>
                )}
                {processo.condicionantes && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-paper-200)]">
                    <p className="text-xs font-medium text-[var(--color-ink-500)] mb-1">Texto original das condicionantes:</p>
                    <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{processo.condicionantes}</p>
                  </div>
                )}
              </div>
            ),
          },
          ...(processo.tipo === "Autorização Ambiental para Corte"
            ? [
                {
                  key: "compensacao",
                  label: "Compensação Ambiental",
                  content: <CompensacaoCorteCard processoId={processo.id} />,
                },
              ]
            : []),
          {
            key: "vinculados",
            label: "Itens vinculados",
            count: processo._count.exigencias + processo._count.documentos + processo._count.condicionantesReg,
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Itens vinculados</h2>
                <div className="space-y-2 text-sm">
                  <Link href={`/exigencias?processoId=${processo.id}`} className="flex items-center justify-between rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-[var(--color-brand-600)] hover:bg-[var(--color-paper-100)]">
                    <span>{processo._count.exigencias} exigência(s)</span>
                    <span>→</span>
                  </Link>
                  <Link href={`/documentos?processoId=${processo.id}`} className="flex items-center justify-between rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-[var(--color-brand-600)] hover:bg-[var(--color-paper-100)]">
                    <span>{processo._count.documentos} documento(s)</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
