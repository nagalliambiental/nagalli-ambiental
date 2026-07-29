import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { FilterSelect } from "@/components/FilterSelect";
import { DocumentosTable } from "@/components/tables/DocumentosTable";

export const dynamic = "force-dynamic";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q, tipo } = await searchParams;

  const where: Prisma.DocumentoWhereInput = {};
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { processo: { numProtocolo: { contains: q, mode: "insensitive" } } },
    ];
  }
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

  return (
    <div>
      <Topbar
        title="Documentos"
        actions={
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Buscar por nome ou processo..." />
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

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <DocumentosTable data={documentos} q={q} />
      </div>
    </div>
  );
}
