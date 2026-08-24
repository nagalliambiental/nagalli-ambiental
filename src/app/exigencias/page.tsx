import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { AlertTriangle, Plus, ListChecks, CheckCircle2, Clock } from "lucide-react";
import { ExigenciasTable } from "@/components/tables/ExigenciasTable";
import { StatCard } from "@/components/StatCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exigências" };

export default async function ExigenciasPage() {
  const exigencias = await prisma.exigencia.findMany({
    include: {
      processo: {
        select: {
          id: true,
          numProtocolo: true,
          tipo: true,
          orgao: { select: { sigla: true } },
          empreendimento: { select: { apelido: true } },
        },
      },
    },
    orderBy: [{ cumprida: "asc" }, { prazo: "asc" }],
  });

  const agora = new Date();
  const cumpridas = exigencias.filter((e) => e.cumprida === true).length;
  const pendentes = exigencias.filter((e) => !e.cumprida).length;
  const vencidas = exigencias.filter((e) => !e.cumprida && e.prazo < agora).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Exigências" }]} />
      <Topbar
        icon={AlertTriangle}
        title="Exigências"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/exigencias/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Nova Exigência
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Exigências na lista" value={exigencias.length} icon={ListChecks} accent="brand" />
        <StatCard label="Cumpridas" value={cumpridas} icon={CheckCircle2} accent="success" />
        <StatCard label="Pendentes" value={pendentes} icon={Clock} accent="warning" />
        <StatCard label="Vencidas" value={vencidas} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ExigenciasTable data={exigencias} />
      </div>
    </div>
  );
}
