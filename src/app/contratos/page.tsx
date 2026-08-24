import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Plus, FileSignature, FileText, CheckCircle2, CalendarClock, AlertTriangle } from "lucide-react";
import { ContratoTable } from "@/components/tables/ContratoTable";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatCard } from "@/components/StatCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Contratos" };

export default async function ContratosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio" && perfil !== "admin") redirect("/");

  const registros = await prisma.contrato.findMany({
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const agora = new Date();
  const em30Dias = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const totalContratos = registros.length;
  const contratosAtivos = registros.filter((r) => r.ativo === true).length;
  const aVencer30Dias = registros.filter(
    (r) => r.ativo === true && r.dataValidade >= agora && r.dataValidade <= em30Dias,
  ).length;
  const vencidos = registros.filter((r) => r.dataValidade < agora).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Contratos" }]} />
      <Topbar
        icon={FileSignature}
        title="Contratos"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/contratos/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo Contrato
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contratos" value={totalContratos} icon={FileText} accent="brand" />
        <StatCard label="Ativos" value={contratosAtivos} icon={CheckCircle2} accent="success" />
        <StatCard
          label="A vencer em 30 dias"
          value={aVencer30Dias}
          icon={CalendarClock}
          accent="warning"
        />
        <StatCard label="Vencidos" value={vencidos} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ContratoTable data={registros} />
      </div>
    </div>
  );
}
