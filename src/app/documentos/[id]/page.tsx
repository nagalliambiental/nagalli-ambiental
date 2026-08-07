export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Download, Building2, Calendar, ArrowLeft, Edit3 } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Tabs } from "@/components/Tabs";
import { UltimaModificacao } from "@/components/UltimaModificacao";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const doc = await prisma.documento.findUnique({ where: { id: Number(id) } });
  return { title: `Documento - ${doc?.nome || "Não encontrado"}` };
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default async function DocumentoDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const doc = await prisma.documento.findUnique({
    where: { id: Number(id) },
    include: {
      processo: { select: { numProtocolo: true, id: true } },
      exigencia: { select: { id: true, descricao: true } },
    },
  });
  if (!doc) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Documentos", href: "/documentos" }, { label: doc.nome }]} />

      <div className="mb-4">
        <Link href="/documentos" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para documentos
        </Link>
      </div>

      <Topbar
        icon={FileText}
        title={doc.nome}
        subtitle="Detalhes do documento"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/documentos/${doc.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <DeleteButton entity="Documento" endpoint={`/api/documentos/${doc.id}`} redirectTo="/documentos" />
          </div>
        }
      />

      <UltimaModificacao entidade="documento" entidadeId={doc.id} />

      <Tabs
        tabs={[
          {
            key: "informacoes",
            label: "Informações",
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <FileText size={16} />
                    <span className="text-[var(--color-ink-900)]">{doc.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Building2 size={16} />
                    <span>{doc.tipo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <Calendar size={16} />
                    <span>{format(doc.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                    <FileText size={16} />
                    <span>{formatBytes(doc.tamanho)}</span>
                  </div>
                </div>
              </div>
            ),
          },
          ...(doc.processo || doc.exigencia
            ? [{
                key: "vinculado",
                label: "Vinculado a",
                content: (
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                    <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Vinculado a</h2>
                    <div className="space-y-2 text-sm">
                      {doc.processo && (
                        <Link href={`/processos/${doc.processo.id}`} className="block text-[var(--color-brand-600)] hover:underline">
                          Processo: {doc.processo.numProtocolo}
                        </Link>
                      )}
                      {doc.exigencia && (
                        <Link href={`/exigencias/${doc.exigencia.id}`} className="block text-[var(--color-brand-600)] hover:underline">
                          Exigência: {doc.exigencia.descricao.slice(0, 60)}...
                        </Link>
                      )}
                    </div>
                  </div>
                ),
              }]
            : []),
          {
            key: "arquivo",
            label: "Arquivo",
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Arquivo</h2>
                <a href={`/api/documentos/${doc.id}/download`} className="focus-ring transition-brand inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]">
                  <Download size={16} />
                  Baixar arquivo
                </a>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
