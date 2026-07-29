import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { FinanceiroTable } from "@/components/tables/FinanceiroTable";

export const dynamic = "force-dynamic";

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
        <FinanceiroTable data={registros} />
      </div>
    </div>
  );
}
