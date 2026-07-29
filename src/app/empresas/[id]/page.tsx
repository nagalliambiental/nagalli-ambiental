import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/Topbar";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const empresa = await prisma.empresa.findUnique({
    where: { id: Number(id) },
    include: { documentosGerados: { orderBy: { createdAt: "desc" } } },
  });

  if (!empresa) return notFound();

  return (
    <div>
      <Link
        href="/empresas"
        className="focus-ring mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
      >
        <ArrowLeft size={14} />
        Todos os clientes
      </Link>
      <Topbar title={empresa.razaoSocial} subtitle={empresa.cnpj} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Dados da empresa</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-[var(--color-ink-500)]">Razão Social</dt><dd>{empresa.razaoSocial}</dd></div>
              <div><dt className="text-[var(--color-ink-500)]">Nome Fantasia</dt><dd>{empresa.nomeFantasia || "—"}</dd></div>
              <div><dt className="text-[var(--color-ink-500)]">CNPJ</dt><dd>{empresa.cnpj}</dd></div>
              <div><dt className="text-[var(--color-ink-500)]">Telefone</dt><dd>{empresa.telefone || "—"}</dd></div>
              <div><dt className="text-[var(--color-ink-500)]">Email</dt><dd>{empresa.email || "—"}</dd></div>
              <div><dt className="text-[var(--color-ink-500)]">Endereço</dt><dd>{[empresa.enderecoRua, empresa.enderecoNumero, empresa.bairro, empresa.cidade, empresa.uf].filter(Boolean).join(", ") || "—"}</dd></div>
            </dl>
          </div>

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">
              <FileText size={18} className="inline mr-2 text-[var(--color-ink-500)]" />
              Gerar documento
            </h2>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <Link
                  key={t.slug}
                  href={`/empresas/${id}/gerar/${t.slug}`}
                  className="focus-ring transition-brand flex items-center justify-between border border-[var(--color-paper-200)] rounded-[var(--radius-card)] px-4 py-3 hover:bg-[var(--color-paper-100)]"
                >
                  <div>
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-xs text-[var(--color-ink-500)]">{t.descricao}</p>
                  </div>
                  <span className="text-sm text-[var(--color-ink-300)]">Gerar →</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Histórico de documentos</h2>
            {empresa.documentosGerados.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-500)]">Nenhum documento gerado ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {empresa.documentosGerados.slice(0, 10).map((d) => (
                  <li key={d.id} className="flex items-center justify-between border-b border-[var(--color-paper-200)] pb-2 last:border-0">
                    <span className="text-[var(--color-ink-700)]">
                      {d.templateSlug === "pgrs-pinhais" ? "PGRS Pinhais" : d.templateSlug === "pgrs-curitiba" ? "PGRS Curitiba" : d.templateSlug}
                    </span>
                    <span className="text-xs text-[var(--color-ink-500)]">
                      {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
