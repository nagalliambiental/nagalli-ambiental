import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Building2, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import EntityActions from "@/components/EntityActions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

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
      <Topbar title="Registro Financeiro" subtitle={`${reg.tipoCobranca} — ${reg.cliente.apelido}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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

          {reg.descricao && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Descrição</h2>
              <p className="text-sm text-[var(--color-ink-700)]">{reg.descricao}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
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

          <Link href="/financeiro" className="focus-ring transition-brand block rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
            Voltar
          </Link>

          <EntityActions
            entity="financeiro"
            entityName="Registro Financeiro"
            endpoint={`/api/financeiro/${reg.id}`}
            redirectTo="/financeiro"
            fields={[
              { name: "tipoCobranca", label: "Tipo de Cobrança", type: "text", required: true },
              { name: "valor", label: "Valor", type: "number", required: true },
              { name: "formaPagamento", label: "Forma de Pagamento", type: "text", required: true },
              { name: "statusPagamento", label: "Status", type: "select", required: true, options: [
                { value: "pendente", label: "Pendente" },
                { value: "pago", label: "Pago" },
                { value: "atrasado", label: "Atrasado" },
                { value: "cancelado", label: "Cancelado" },
              ] },
              { name: "dataVencimento", label: "Data Vencimento", type: "date" },
              { name: "dataPagamento", label: "Data Pagamento", type: "date" },
              { name: "descricao", label: "Descrição", type: "textarea" },
            ]}
            data={{
              tipoCobranca: reg.tipoCobranca,
              valor: reg.valor,
              formaPagamento: reg.formaPagamento,
              statusPagamento: reg.statusPagamento,
              dataVencimento: reg.dataVencimento?.toISOString(),
              dataPagamento: reg.dataPagamento?.toISOString(),
              descricao: reg.descricao,
            }}
          />
        </div>
      </div>
    </div>
  );
}
