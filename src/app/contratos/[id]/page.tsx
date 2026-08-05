export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, FileText, Calendar, Clock, Edit3, ArrowLeft, FileSignature } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";
import { UltimaModificacao } from "@/components/UltimaModificacao";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Contrato" };
}

function getSituacao(dataValidade: Date, alertaRenovacaoDias: number) {
  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diffDias = Math.ceil((validade.getTime() - hoje.getTime()) / 86400000);
  if (diffDias < 0) return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (diffDias <= alertaRenovacaoDias) return { label: `Vence em ${diffDias}d`, cls: "bg-[var(--color-river-100)] text-[var(--color-river-700)]" };
  return { label: "Vigente", cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" };
}

export default async function ContratoDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio" && perfil !== "admin") redirect("/");

  const { id } = await props.params;
  const contrato = await prisma.contrato.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });
  if (!contrato) notFound();

  const situacao = getSituacao(contrato.dataValidade, contrato.alertaRenovacaoDias);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Contratos", href: "/contratos" }, { label: contrato.cliente.apelido }]} />

      <div className="mb-4">
        <Link href="/contratos" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para contratos
        </Link>
      </div>

      <Topbar
        icon={FileSignature}
        title={contrato.cliente.apelido}
        subtitle={contrato.servicoProcesso}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/contratos/${contrato.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <DeleteButton entity="Contrato" endpoint={`/api/contratos/${contrato.id}`} redirectTo="/contratos" />
          </div>
        }
      />

      <UltimaModificacao entidade="contrato" entidadeId={contrato.id} />

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
                    <Building2 size={16} />
                    <Link href={`/clientes/${contrato.cliente.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">{contrato.cliente.apelido}</Link>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Building2 size={16} />
                    {contrato.empreendimento ? (
                      <Link href={`/empreendimentos/${contrato.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">{contrato.empreendimento.apelido}</Link>
                    ) : <span>Sem vínculo</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <FileText size={16} />
                    <span className="line-clamp-2">{contrato.servicoProcesso}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${situacao.cls}`}>{situacao.label}</span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "datas",
            label: "Datas & Renovação",
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Datas & Renovação</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Calendar size={14} />
                    <span>Assinatura: <span className="font-medium text-[var(--color-ink-900)]">{format(contrato.dataAssinatura, "dd/MM/yyyy", { locale: ptBR })}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Calendar size={14} />
                    <span>Validade: <span className="font-medium text-[var(--color-ink-900)]">{format(contrato.dataValidade, "dd/MM/yyyy", { locale: ptBR })}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Clock size={14} />
                    <span>Alerta de renovação: <span className="font-medium text-[var(--color-ink-900)]">{contrato.alertaRenovacaoDias} dias antes do vencimento</span></span>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
