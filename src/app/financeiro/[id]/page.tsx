export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Building2, Calendar, FileText, Edit3, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";
import { UltimaModificacao } from "@/components/UltimaModificacao";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  pago: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  atrasado: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  cancelado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export async function generateMetadata() {
  return { title: "Registro Financeiro" };
}

export default async function FinanceiroDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio") redirect("/");

  const { id } = await props.params;
  const reg = await prisma.financeiro.findUnique({
    where: { id: Number(id) },
    include: { cliente: { select: { apelido: true, id: true } } },
  });
  if (!reg) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Financeiro", href: "/financeiro" }, { label: "Registro" }]} />

      <div className="mb-4">
        <Link href="/financeiro" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para financeiro
        </Link>
      </div>

      <UltimaModificacao entidade="financeiro" entidadeId={reg.id} />

      <Topbar
        title="Registro Financeiro"
        subtitle={`${reg.tipoCobranca} — ${reg.cliente.apelido}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/financeiro/${reg.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <DeleteButton entity="Registro Financeiro" endpoint={`/api/financeiro/${reg.id}`} redirectTo="/financeiro" />
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
                    <Building2 size={16} />
                    <Link href={`/clientes/${reg.cliente.id}`} className="text-[var(--color-brand-600)] hover:underline">{reg.cliente.apelido}</Link>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <FileText size={16} />
                    <span>{reg.tipoCobranca}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <DollarSign size={16} />
                    <span className="font-medium text-[var(--color-ink-900)]">{reg.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <FileText size={16} />
                    <span>{reg.formaPagamento || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[reg.statusPagamento] || ""}`}>{statusLabels[reg.statusPagamento] || reg.statusPagamento}</span>
                  </div>
                </div>
              </div>
            ),
          },
          ...(reg.descricao
            ? [{
                key: "descricao",
                label: "Descrição",
                content: (
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                    <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Descrição</h2>
                    <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{reg.descricao}</p>
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
                  {reg.dataVencimento && (
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <Calendar size={14} />
                      <span>Vencimento: {format(reg.dataVencimento, "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                  {reg.dataPagamento && (
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <Calendar size={14} />
                      <span>Pagamento: {format(reg.dataPagamento, "dd/MM/yyyy", { locale: ptBR })}</span>
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
