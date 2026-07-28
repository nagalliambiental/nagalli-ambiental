import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Eye, DollarSign } from "lucide-react";
import RowActions from "@/components/RowActions";

export const dynamic = "force-dynamic";

const statusPagamentoLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const statusPagamentoColors: Record<string, string> = {
  pendente: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  pago: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  atrasado: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  cancelado: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export default async function FinanceiroPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio") redirect("/");

  const registros = await prisma.financeiro.findMany({
    include: {
      cliente: { select: { apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div>
      <Topbar
        title="Financeiro"
        actions={
          <Link
            href="/financeiro/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Nova Cobrança
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {registros.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Cliente</th>
                <th className="text-left p-4 font-medium">Tipo</th>
                <th className="text-right p-4 font-medium">Valor</th>
                <th className="text-left p-4 font-medium">Pagamento</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Vencimento</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-medium text-[var(--color-ink-900)]">{r.cliente.apelido}</td>
                  <td className="p-4">{r.tipoCobranca}</td>
                  <td className="p-4 text-right font-medium">
                    {r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="p-4">{r.formaPagamento || "—"}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${statusPagamentoColors[r.statusPagamento] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                      {statusPagamentoLabels[r.statusPagamento] || r.statusPagamento}
                    </span>
                  </td>
                  <td className="p-4">
                    {r.dataVencimento ? format(r.dataVencimento, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </td>
                  <td className="p-4">
                    <RowActions detailUrl={`/financeiro/${r.id}`} entity="financeiro" entityName="Registro Financeiro" endpoint={`/api/financeiro/${r.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <DollarSign size={24} />
            </div>
            <p className="text-sm">Nenhum registro financeiro encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
