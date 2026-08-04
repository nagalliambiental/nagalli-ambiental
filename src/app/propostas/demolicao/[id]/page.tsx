import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/templates/proposta-demolicao/config";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UltimaModificacao } from "@/components/UltimaModificacao";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const proposta = await prisma.propostaDemolicao.findUnique({ where: { id: Number(id) }, select: { numero: true, ano: true } });
  return { title: `Proposta ${proposta?.numero}/${proposta?.ano} — Demolição` };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const proposta = await prisma.propostaDemolicao.findUnique({ where: { id: Number(id) } });
  if (!proposta) notFound();

  const valorTotalPgrcc = (proposta.valorUnitPgrcc * proposta.quantidadePgrcc) / 0.82;
  const valorTotalRgrcc = (proposta.valorUnitRgrcc * proposta.quantidadeRgrcc) / 0.82;
  const totalCalculado = valorTotalPgrcc + valorTotalRgrcc;
  const valorDesconto = totalCalculado * ((proposta.percentualDesconto ?? 18) / 100);
  const totalComDesconto = totalCalculado - valorDesconto;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Demolição", href: "/propostas/demolicao" },
          { label: `${proposta.numero}/${proposta.ano}` },
        ]}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Proposta PGRCC/RGRCC — Demolição</h1>
          <p className="text-ink-500 mt-1 font-mono text-brand-700 text-lg">
            Identificação: {proposta.numero} / {proposta.ano} – REV. {String(proposta.revisao).padStart(2, "0")}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <form action={`/api/propostas-demolicao/${proposta.id}/gerar`} method="POST" className="m-0">
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 transition"
            >
              Gerar DOCX
            </button>
          </form>
          <a
            href={`/propostas/demolicao/${proposta.id}/editar`}
            className="px-4 py-2 border border-ink-300 text-ink-700 rounded hover:bg-gray-50 transition"
          >
            Editar
          </a>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-ink-900 mb-3">Dados do Destinatário</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Engenheiro:</dt>
              <dd className="text-ink-900 font-medium">{proposta.engenheiroNome}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Empresa:</dt>
              <dd className="text-ink-900 font-medium">{proposta.empresaNome}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Local:</dt>
              <dd className="text-ink-900 font-medium">
                {proposta.bairro}, {proposta.cidade}/{proposta.uf}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-ink-900 mb-3">Itens</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">PGRCC Demolição:</dt>
              <dd className="text-ink-900 font-medium">{proposta.quantidadePgrcc} unidade(s)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">RGRCC Demolição:</dt>
              <dd className="text-ink-900 font-medium">{proposta.quantidadeRgrcc} unidade(s)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Valor HT:</dt>
              <dd className="text-ink-900 font-medium">{formatarMoeda(proposta.valorUnitPgrcc)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">% Desconto:</dt>
              <dd className="text-ink-900 font-medium">{proposta.percentualDesconto}%</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-brand-50 rounded-lg p-4">
        <h3 className="font-semibold text-ink-900 mb-3">Investimento</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-brand-200">
            <tr>
              <td className="py-2 text-ink-500">Elaboração de PGRCC ({proposta.quantidadePgrcc} × {formatarMoeda(proposta.valorUnitPgrcc)} / 0,82)</td>
              <td className="py-2 text-right font-medium text-brand-700">{formatarMoeda(valorTotalPgrcc)}</td>
            </tr>
            <tr>
              <td className="py-2 text-ink-500">Elaboração de RGRCC ({proposta.quantidadeRgrcc} × {formatarMoeda(proposta.valorUnitRgrcc)} / 0,82)</td>
              <td className="py-2 text-right font-medium text-brand-700">{formatarMoeda(valorTotalRgrcc)}</td>
            </tr>
            <tr>
              <td className="py-2 text-ink-500">Anotação de Responsabilidade Técnica CREA-PR</td>
              <td className="py-2 text-right font-medium text-brand-700">incluso</td>
            </tr>
            <tr className="font-bold">
              <td className="py-2 pt-4 text-ink-900">Total Calculado</td>
              <td className="py-2 pt-4 text-right text-brand-700">{formatarMoeda(totalCalculado)}</td>
            </tr>
            <tr>
              <td className="py-2 text-ink-500">Desconto ({proposta.percentualDesconto}%)</td>
              <td className="py-2 text-right text-red-600">-{formatarMoeda(valorDesconto)}</td>
            </tr>
            <tr className="font-bold text-lg">
              <td className="py-2 pt-4 text-brand-800">Total com Desconto</td>
              <td className="py-2 pt-4 text-right text-brand-800">
                {proposta.totalFinal ? formatarMoeda(proposta.totalFinal) : formatarMoeda(totalComDesconto)}
              </td>
            </tr>
          </tbody>
        </table>
        {proposta.totalFinal && proposta.totalFinal !== totalComDesconto && (
          <p className="text-xs text-ink-500 mt-2">
            * Valor final ajustado manualmente (era {formatarMoeda(totalComDesconto)})
          </p>
        )}
        <p className="text-xs text-ink-500 mt-2">
          * 1 HT = {formatarMoeda(291.78)} (valor correspondente a 3% de 6 salários mínimos = SENGE-PR)
        </p>
      </div>

      {proposta.observacoes && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-ink-900 mb-2">Observações</h3>
          <p className="text-ink-700 whitespace-pre-wrap">{proposta.observacoes}</p>
        </div>
      )}

      <UltimaModificacao entidade="PropostaDemolicao" entidadeId={proposta.id} />
    </div>
  );
}