import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Eye, Link as LinkIcon, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

const tipoColors: Record<string, string> = {
  lei: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  decreto: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  norma: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  resolucao: "bg-[var(--color-paper-100)] text-[var(--color-ink-700)]",
  portaria: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  instrucao_normativa: "bg-[var(--color-paper-100)] text-[var(--color-ink-700)]",
  outro: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
};

export default async function LegislacaoPage() {
  const legislacoes = await prisma.legislacao.findMany({
    include: {
      _count: { select: { processos: true } },
    },
    orderBy: [{ data: "desc" }, { nome: "asc" }],
  });

  return (
    <div>
      <Topbar
        title="Legislação"
        actions={
          <Link
            href="/legislacao/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Nova Legislação
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {legislacoes.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Nome</th>
                <th className="text-left p-4 font-medium">Tipo</th>
                <th className="text-left p-4 font-medium">Número</th>
                <th className="text-left p-4 font-medium">Data</th>
                <th className="text-center p-4 font-medium">Processos</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {legislacoes.map((l) => (
                <tr key={l.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-medium max-w-xs truncate text-[var(--color-ink-900)]">{l.nome}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${tipoColors[l.tipo] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                      {l.tipo === "instrucao_normativa"
                        ? "Instrução Normativa"
                        : l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">{l.numero}</td>
                  <td className="p-4">
                    {l.data ? format(l.data, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                  </td>
                  <td className="p-4 text-center">{l._count.processos}</td>
                  <td className="p-4">
                    <div className="flex gap-3">
                      <Link
                        href={`/legislacao/${l.id}`}
                        className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                      >
                        <Eye size={14} />
                        Detalhes
                      </Link>
                      {l.url && (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                        >
                          <LinkIcon size={14} />
                          Link
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <BookOpen size={24} />
            </div>
            <p className="text-sm">Nenhuma legislação cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
