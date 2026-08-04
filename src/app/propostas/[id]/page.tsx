import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UltimaModificacao } from "@/components/UltimaModificacao";
import DeleteButton from "@/components/DeleteButton";
import { getModeloProposta } from "@/lib/propostas/modelos";
import type { CampoProposta } from "@/lib/propostas/modelos";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const proposta = await prisma.propostaServico.findUnique({ where: { id: Number(id) }, select: { numero: true, ano: true } });
  return { title: `Proposta ${proposta?.numero}/${proposta?.ano}` };
}

function formatarValor(campo: CampoProposta, valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (campo.tipo === "moeda" && typeof valor === "number") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  }
  return String(valor);
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const proposta = await prisma.propostaServico.findUnique({ where: { id: Number(id) } });
  if (!proposta) notFound();

  const modelo = getModeloProposta(proposta.modeloSlug);
  if (!modelo) notFound();

  const dados = (proposta.dados ?? {}) as Record<string, unknown>;
  const resumo = modelo.calcular(dados);

  const grupos: string[] = [];
  for (const campo of modelo.campos) {
    const g = campo.grupo ?? "Geral";
    if (!grupos.includes(g)) grupos.push(g);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: `${proposta.numero}/${proposta.ano}` },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-ink-900)]">{modelo.nome}</h1>
          <p className="text-[var(--color-ink-500)] mt-1 font-mono text-lg text-[var(--color-brand-700)]">
            Identificação: {proposta.numero} / {proposta.ano} – REV. {String(proposta.revisao).padStart(2, "0")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <form action={`/api/propostas-servico/${proposta.id}/gerar`} method="POST" className="m-0">
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--color-brand-600)] text-white rounded hover:bg-[var(--color-brand-700)] transition"
            >
              Gerar DOCX
            </button>
          </form>
          <Link
            href={`/propostas/${proposta.id}/editar`}
            className="px-4 py-2 border border-[var(--color-paper-200)] text-[var(--color-ink-700)] rounded hover:bg-[var(--color-paper-50)] transition"
          >
            Editar
          </Link>
          <DeleteButton
            entity="Proposta"
            endpoint={`/api/propostas-servico/${proposta.id}`}
            redirectTo="/propostas"
          />
        </div>
      </div>

      {grupos.map((grupo) => (
        <div key={grupo} className="bg-[var(--color-paper-50)] rounded-lg p-4">
          <h3 className="font-semibold text-[var(--color-ink-900)] mb-3">{grupo}</h3>
          <dl className="space-y-2 text-sm">
            {modelo.campos
              .filter((c) => (c.grupo ?? "Geral") === grupo)
              .map((campo) => {
                const valor = formatarValor(campo, dados[campo.name]);
                if (valor === null) return null;
                return (
                  <div key={campo.name} className="flex justify-between gap-4">
                    <dt className="text-[var(--color-ink-500)]">{campo.label}:</dt>
                    <dd className="text-[var(--color-ink-900)] font-medium text-right whitespace-pre-wrap">{valor}</dd>
                  </div>
                );
              })}
          </dl>
        </div>
      ))}

      {resumo.length > 0 && (
        <div className="bg-[var(--color-brand-50)] rounded-lg p-4">
          <h3 className="font-semibold text-[var(--color-ink-900)] mb-3">Investimento</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--color-brand-200)]">
              {resumo.map((linha, i) => (
                <tr
                  key={i}
                  className={
                    linha.destaque ? "font-bold" : ""
                  }
                >
                  <td className={`py-2 ${linha.destaque ? "text-[var(--color-ink-900)]" : "text-[var(--color-ink-500)]"}`}>
                    {linha.label}
                  </td>
                  <td className={`py-2 text-right ${linha.negativo ? "text-red-600" : "text-[var(--color-brand-700)]"}`}>
                    {linha.valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UltimaModificacao entidade="PropostaServico" entidadeId={proposta.id} />
    </div>
  );
}
