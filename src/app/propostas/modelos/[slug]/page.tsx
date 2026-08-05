import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ehPrivilegiado } from "@/lib/perfil";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SectionCard } from "@/components/ui/SectionCard";
import { getModeloProposta } from "@/lib/propostas/modelos-server";
import { getModeloEmbutido } from "@/lib/propostas/modelos";
import { FileStack, Copy, FileText, Sparkles } from "lucide-react";
import type { CampoProposta } from "@/lib/propostas/modelos";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<CampoProposta["tipo"], string> = {
  texto: "Texto",
  numero: "Número",
  moeda: "Moeda (R$)",
  selecao: "Seleção",
  textarea: "Texto longo",
};

function CampoGrupo({ campo }: { campo: CampoProposta }) {
  const detalhes: string[] = [];
  if (campo.tipo === "selecao" && campo.opcoes?.length) {
    detalhes.push(`Opções: ${campo.opcoes.join(", ")}`);
  }
  if (campo.defaultValue != null) {
    detalhes.push(`Padrão: ${campo.defaultValue}`);
  }
  if (campo.dica) {
    detalhes.push(`Dica: ${campo.dica}`);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink-700)]">
        {TIPO_LABEL[campo.tipo]}
      </span>
      {detalhes.map((d, i) => (
        <span key={i} className="text-xs text-[var(--color-ink-500)]">
          {d}
        </span>
      ))}
    </div>
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!ehPrivilegiado((session.user as { perfil?: string }).perfil)) redirect("/");

  const { slug } = await params;
  const modelo = await getModeloProposta(slug);
  if (!modelo) notFound();

  const embutido = Boolean(getModeloEmbutido(slug));
  let temTemplate = false;
  if (!embutido) {
    const m = await prisma.propostaModelo.findUnique({
      where: { slug },
      select: { template: true },
    });
    temTemplate = Boolean(m?.template);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Modelos de Proposta", href: "/propostas/modelos" },
          { label: modelo.nome },
        ]}
      />
      <Topbar
        icon={FileStack}
        title={modelo.nome}
        subtitle={modelo.descricao}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/propostas/modelos"
              className="focus-ring transition-brand inline-flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Voltar
            </Link>
            {embutido ? (
              <Link
                href={`/propostas/modelos/novo?duplicar=${modelo.slug}`}
                className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                <Copy size={16} />
                Duplicar como novo modelo
              </Link>
            ) : (
              <Link
                href={`/propostas/modelos/${slug}/editar`}
                className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                <FileText size={16} />
                Editar
              </Link>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <SectionCard icon={Sparkles} title="Dados do modelo" subtitle="Informações gerais do modelo de proposta">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Nome</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">{modelo.nome}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Slug</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-ink-700)]">{modelo.slug}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Prefixo do arquivo</dt>
              <dd className="mt-1 font-mono text-sm text-[var(--color-ink-700)]">{modelo.prefixoArquivo}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Origem</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">
                {embutido ? "Embutido no sistema (em código)" : "Cadastrado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Template</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">
                {embutido ? (
                  <span className="rounded-full bg-[var(--color-brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-700)]">DOCX embutido</span>
                ) : temTemplate ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">DOCX</span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Falta template</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Quantidade de campos</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--color-ink-900)]">{modelo.campos.length}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard icon={FileText} title="Campos do modelo" subtitle="A chave (name) deve bater com a marcação {campo} no DOCX">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-paper-50)]">
                <tr>
                  <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Chave</th>
                  <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Rótulo</th>
                  <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Tipo / Detalhes</th>
                  <th className="p-3 text-left font-medium text-[var(--color-ink-700)]">Grupo</th>
                  <th className="p-3 text-center font-medium text-[var(--color-ink-700)]">Obrigatório</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-paper-200)]">
                {modelo.campos.map((campo) => (
                  <tr key={campo.name} className="hover:bg-[var(--color-paper-50)]">
                    <td className="p-3 font-mono text-xs text-[var(--color-brand-700)]">{campo.name}</td>
                    <td className="p-3 font-medium text-[var(--color-ink-900)]">{campo.label}</td>
                    <td className="p-3">
                      <CampoGrupo campo={campo} />
                    </td>
                    <td className="p-3 text-[var(--color-ink-700)]">{campo.grupo ?? "Geral"}</td>
                    <td className="p-3 text-center text-[var(--color-ink-700)]">
                      {campo.required ? "Sim" : "Não"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {embutido && (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-5 py-4 text-sm text-[var(--color-brand-900)]">
            <p className="font-medium">Modelo embutido — não é editável diretamente.</p>
            <p className="mt-1">
              Use <span className="font-medium">Duplicar como novo modelo</span> para copiar esta configuração para um
              modelo cadastrado e adaptá-la como exemplo para outros serviços.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
