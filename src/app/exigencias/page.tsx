import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { ExigenciasTable } from "@/components/tables/ExigenciasTable";

export const dynamic = "force-dynamic";

export default async function ExigenciasPage() {
  const exigencias = await prisma.exigencia.findMany({
    include: {
      processo: {
        select: {
          numProtocolo: true,
          orgao: { select: { sigla: true } },
          empreendimento: { select: { apelido: true } },
        },
      },
    },
    orderBy: [{ cumprida: "asc" }, { prazo: "asc" }],
  });

  return (
    <div>
      <Topbar
        title="Exigências"
        actions={
          <Link
            href="/exigencias/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Nova Exigência
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <ExigenciasTable data={exigencias} />
      </div>
    </div>
  );
}
