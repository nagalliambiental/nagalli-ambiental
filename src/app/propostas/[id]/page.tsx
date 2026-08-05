import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UltimaModificacao } from "@/components/UltimaModificacao";
import DeleteButton from "@/components/DeleteButton";
import { getModeloProposta } from "@/lib/propostas/modelos-server";
import { calcularModelo, calcularItensModelo } from "@/lib/propostas/modelos";
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

  const modelo = await getModeloProposta(proposta.modeloSlug);
  if (!modelo) notFound();

  const dados = (proposta.dados ?? {}) as Record<string, unknown>;
  const resumo = calcularModelo(modelo, dados);
  const itens = calcularItensModelo(modelo, dados);

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

      {(itens.length > 0 || resumo.length > 0) && (
        <div className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <div className="border-b border-[var(--color-paper-200)] px-6 py-4">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
              Valores da Proposta
            </h2>
            <p className="text-xs text-[var(--color-ink-500)] mt-0.5">
              Detalhamento dos itens e investimento previsto
            </p>
          </div>

          <div className="p-6 space-y-8">
            {itens.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-700)] mb-3">
                  Itens da Proposta
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)]">
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-500)]">Descrição</th>
                        <th className="px-4 py-2.5 text-center font-medium text-[var(--color-ink-500)]">Qtd.</th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-500)]">Valor Unit.</th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-500)]">Valor Total</th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-500)]">Valor c/ Desconto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-paper-100)]">
                      {itens.map((item, i) => (
                        <tr key={i}>
                          <td className={`px-4 py-3 text-[var(--color-ink-900)] ${item.incluso ? "italic" : ""}`}>
                            {item.descricao}
                          </td>
                          <td className="px-4 py-3 text-center text-[var(--color-ink-700)]">{item.quantidade}</td>
                          <td className="px-4 py-3 text-right text-[var(--color-ink-700)]">{item.valorUnitario}</td>
                          <td className="px-4 py-3 text-right font-medium text-[var(--color-ink-900)]">{item.valorTotal}</td>
                          <td className="px-4 py-3 text-right font-medium text-[var(--color-brand-700)]">
                            {item.valorLiquido}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {resumo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-700)] mb-3">
                  Resumo do Investimento
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-[var(--color-paper-100)]">
                      {resumo.map((linha, i) => (
                        <tr key={i} className={linha.destaque ? "bg-[var(--color-brand-100)]" : ""}>
                          <td className={`px-4 py-3 ${linha.destaque ? "font-bold text-[var(--color-ink-900)]" : "text-[var(--color-ink-700)]"}`}>
                            {linha.label}
                          </td>
                          <td className={`px-4 py-3 text-right ${linha.negativo ? "text-red-600" : "text-[var(--color-brand-700)]"} ${linha.destaque ? "font-bold" : "font-medium"}`}>
                            {linha.valor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <UltimaModificacao entidade="PropostaServico" entidadeId={proposta.id} />
    </div>
  );
}
