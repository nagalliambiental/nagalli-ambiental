import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Banknote, CheckCircle2, Clock, DollarSign, Plus, Wallet } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { FinanceiroTable } from "@/components/tables/FinanceiroTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio" && perfil !== "admin") redirect("/");

  const registros = await prisma.financeiro.findMany({
    include: {
      cliente: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const pagos = registros.filter((r) => r.statusPagamento === "pago");
  const emAberto = registros.filter((r) => r.statusPagamento !== "pago");
  const totalEmAberto = emAberto.reduce((soma, r) => soma + r.valor, 0);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Financeiro" }]} />
      <Topbar
        icon={DollarSign}
        title="Financeiro"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/financeiro/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Cobrança
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lançamentos na lista" value={registros.length} icon={Wallet} accent="brand" />
        <StatCard label="Pagos" value={pagos.length} icon={CheckCircle2} accent="success" />
        <StatCard label="Em aberto" value={emAberto.length} icon={Clock} accent="warning" />
        <StatCard
          label="Total em aberto"
          value={"R$ " + totalEmAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={Banknote}
          accent="danger"
        />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <FinanceiroTable data={registros} />
      </div>
    </div>
  );
}
