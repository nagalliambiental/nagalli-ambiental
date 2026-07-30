import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Building2, Map, Calendar, Users, ClipboardList, FileCheck2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import EntityActions from "@/components/EntityActions";

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
      _count: { select: { exigencias: true, documentos: true } },
    },
  });
  if (!processo) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Processos", href: "/processos" }, { label: processo.numProtocolo }]} />
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
            {processo.condicionantes && (
              <div className="mt-4 border-t border-[var(--color-paper-200)] pt-4">
                <h3 className="text-sm font-medium text-[var(--color-ink-900)] mb-1">Condicionantes</h3>
                <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{processo.condicionantes}</p>
              </div>
            )}
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
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <AlertTriangle size={14} />
                <span>Alerta: {processo.alertaDias} dias antes do vencimento</span>
              </div>
              <div className="flex justify-between"><span className="text-[var(--color-ink-500)]">Criado em</span><span>{format(processo.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span></div>
            </div>
          </div>

          {processo.responsavel && (
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
          )}

          <Link href="/processos" className="focus-ring transition-brand block rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
            Voltar
          </Link>

          <EntityActions
            entity="processo"
            entityName="Processo"
            endpoint={`/api/processos/${processo.id}`}
            redirectTo="/processos"
            fields={[
              { name: "tipo", label: "Tipo", type: "text", required: true },
              { name: "numProtocolo", label: "Nº Protocolo", type: "text", required: true },
              { name: "numLicenca", label: "Nº Licença", type: "text" },
              { name: "sistema", label: "Sistema", type: "text", required: true },
              { name: "status", label: "Status", type: "select", required: true, options: [
                { value: "protocolado", label: "Protocolado" },
                { value: "em_andamento", label: "Em Andamento" },
                { value: "exigencia_recebida", label: "Exigência Recebida" },
                { value: "deferido", label: "Deferido" },
                { value: "indeferido", label: "Indeferido" },
                { value: "arquivado", label: "Arquivado" },
              ] },
              { name: "validade", label: "Validade", type: "date" },
              { name: "dataProtocolo", label: "Data Protocolo", type: "date" },
              { name: "dataContato", label: "Data Contato", type: "date" },
              { name: "alertaDias", label: "Alerta (dias)", type: "number" },
              { name: "condicionantes", label: "Condicionantes", type: "textarea" },
              { name: "observacoes", label: "Observações", type: "textarea" },
            ]}
            data={{
              tipo: processo.tipo,
              numProtocolo: processo.numProtocolo,
              numLicenca: processo.numLicenca,
              sistema: processo.sistema,
              status: processo.status,
              validade: processo.validade?.toISOString(),
              dataProtocolo: processo.dataProtocolo?.toISOString(),
              dataContato: processo.dataContato?.toISOString(),
              alertaDias: processo.alertaDias,
              condicionantes: processo.condicionantes,
              observacoes: processo.observacoes,
            }}
          />
        </div>
      </div>
    </div>
  );
}
