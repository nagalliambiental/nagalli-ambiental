import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Download, FileText } from "lucide-react";
import RowActions from "@/components/RowActions";
import { SearchBar } from "@/components/SearchBar";
import { FilterSelect } from "@/components/FilterSelect";

export const dynamic = "force-dynamic";

const tipoColors: Record<string, string> = {
  licenca: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  parecer: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  oficio: "bg-[var(--color-paper-100)] text-[var(--color-ink-700)]",
  laudo: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  relatorio: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  contrato: "bg-[var(--color-paper-100)] text-[var(--color-ink-700)]",
  anexo: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  outro: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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
        {documentos.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium">Tipo</th>
                <th className="text-left p-4 font-medium">Processo</th>
                <th className="text-left p-4 font-medium">Tamanho</th>
                <th className="text-left p-4 font-medium">Data</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-medium max-w-xs truncate">
                    <Link href={`/documentos/${d.id}`} className="text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">
                      {d.nome}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${tipoColors[d.tipo] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                      {d.tipo.charAt(0).toUpperCase() + d.tipo.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm">
                    {d.processo?.numProtocolo || "—"}
                  </td>
                  <td className="p-4">{formatBytes(d.tamanho)}</td>
                  <td className="p-4">
                    {format(d.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <a href={d.caminho} download className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]" title="Download">
                        <Download size={16} />
                      </a>
                      <RowActions detailUrl={`/documentos/${d.id}`} entity="documento" entityName="Documento" endpoint={`/api/documentos/${d.id}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <FileText size={24} />
            </div>
            <p className="text-sm">{q || tipo ? "Nenhum documento encontrado para essa busca" : "Nenhum documento cadastrado"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
