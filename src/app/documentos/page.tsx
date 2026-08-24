import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CheckCircle2, Files, FolderOpen, Link2, Plus } from "lucide-react";
import { FilterSelect } from "@/components/FilterSelect";
import { StatCard } from "@/components/StatCard";
import { DocumentosTable } from "@/components/tables/DocumentosTable";

export const dynamic = "force-dynamic";

export const metadata = { title: "Documentos" };

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;

  const where: Prisma.DocumentoWhereInput = {};
  if (tipo) {
    where.tipo = tipo;
  }

  const documentos = await prisma.documento.findMany({
    where,
    include: {
      processo: { select: { numProtocolo: true } },
      exigencia: { select: { id: true, descricao: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  const comProcesso = documentos.filter((d) => d.processoId != null).length;
  const comExigencia = documentos.filter((d) => d.exigenciaId != null).length;

  const contagemTipos = new Map<string, number>();
  for (const doc of documentos) {
    contagemTipos.set(doc.tipo, (contagemTipos.get(doc.tipo) ?? 0) + 1);
  }
  let tipoPredominante = "-";
  let maxCount = 0;
  for (const [t, c] of contagemTipos) {
    if (c > maxCount) {
      maxCount = c;
      tipoPredominante = t;
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Documentos" }]} />
      <Topbar
        icon={FolderOpen}
        title="Documentos"
        actions={
          <div className="flex items-center gap-3">
            <FilterSelect
              paramName="tipo"
              options={[
                { value: "", label: "Todos os tipos" },
                { value: "licenca", label: "Licença" },
                { value: "parecer", label: "Parecer" },
                { value: "oficio", label: "Ofício" },
                { value: "laudo", label: "Laudo" },
                { value: "relatorio", label: "Relatório" },
                { value: "contrato", label: "Contrato" },
                { value: "anexo", label: "Anexo" },
                { value: "outro", label: "Outro" },
              ]}
            />
            <Link
              href="/documentos/novo"
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Plus size={16} />
              Novo Documento
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Documentos" value={documentos.length} icon={FolderOpen} accent="brand" />
        <StatCard label="Vinculados a processos" value={comProcesso} icon={Link2} accent="river" />
        <StatCard label="Atendem exigências" value={comExigencia} icon={CheckCircle2} accent="success" />
        <StatCard
          label="Tipo predominante"
          value={tipoPredominante}
          hint={maxCount > 0 ? `${maxCount} documento(s)` : undefined}
          icon={Files}
          accent="warning"
        />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <DocumentosTable data={documentos} />
      </div>
    </div>
  );
}
