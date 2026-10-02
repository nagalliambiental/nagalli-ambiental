import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Plus, FileText, ShieldCheck, CalendarClock, AlertTriangle } from "lucide-react";
import { PgrsTable } from "@/components/tables/PgrsTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "PGRS" };

export default async function PgrsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const registros = await prisma.pgrs.findMany({
    where: { ativo: true },
    include: {
      empreendimento: {
        select: { id: true, apelido: true, cliente: { select: { id: true, apelido: true } } },
      },
      cliente: { select: { id: true, apelido: true } },
    },
    orderBy: [{ validade: "asc" }, { criadoEm: "desc" }],
  });

  const agora = new Date();
  const total = registros.length;
  const comValidade = registros.filter((r) => r.validade);
  const vencidos = comValidade.filter((r) => new Date(r.validade!) < agora).length;
  const emAlerta = comValidade.filter((r) => {
    const d = new Date(r.validade!);
    const diff = Math.ceil((d.getTime() - agora.getTime()) / 86400000);
    return diff >= 0 && diff <= r.alertaDias;
  }).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "PGRS" }]} />
      <Topbar
        icon={ShieldCheck}
        title="PGRS"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/pgrs/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo PGRS
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="PGRS" value={total} icon={FileText} accent="brand" />
        <StatCard label="Com validade" value={comValidade.length} icon={ShieldCheck} accent="success" />
        <StatCard label="Em alerta" value={emAlerta} icon={CalendarClock} accent="warning" />
        <StatCard label="Vencidos" value={vencidos} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <PgrsTable data={registros} />
      </div>
    </div>
  );
}
