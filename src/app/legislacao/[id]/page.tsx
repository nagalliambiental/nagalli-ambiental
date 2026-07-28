import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen, FileText, Calendar, Link as LinkIcon } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const tipoLabels: Record<string, string> = {
  lei: "Lei",
  decreto: "Decreto",
  norma: "Norma",
  resolucao: "Resolução",
  portaria: "Portaria",
  instrucao_normativa: "Instrução Normativa",
  outro: "Outro",
};

export default async function LegislacaoDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const leg = await prisma.legislacao.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { processos: true } } },
  });
  if (!leg) notFound();

  return (
    <div>
      <Topbar title={leg.nome} subtitle={tipoLabels[leg.tipo] || leg.tipo} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <BookOpen size={16} />
                <span className="text-[var(--color-ink-900)]">{tipoLabels[leg.tipo] || leg.tipo}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <FileText size={16} />
                <span>Nº {leg.numero}</span>
              </div>
              {leg.data && (
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Calendar size={16} />
                  <span>{format(leg.data, "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
            </div>
          </div>

          {leg.descricao && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Descrição</h2>
              <p className="text-sm text-[var(--color-ink-700)]">{leg.descricao}</p>
            </div>
          )}

          {leg.url && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Link</h2>
              <a href={leg.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
                <LinkIcon size={14} />
                {leg.url}
              </a>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Processos</h2>
            <p className="text-sm text-[var(--color-ink-500)]">
              {leg._count.processos} processo(s) vinculado(s) a esta legislação.
            </p>
          </div>

          <Link href="/legislacao" className="focus-ring transition-brand block rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}
