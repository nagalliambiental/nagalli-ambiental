import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function ExigenciasPage() {
  const exigencias = await prisma.exigencia.findMany({
    include: {
      processo: {
        select: {
          numProtocolo: true,
          orgao: { select: { sigla: true } },
          empreendimento: { select: { apelido: true } },
        },
      },
    },
    orderBy: [{ cumprida: "asc" }, { prazo: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Exigências</h1>
        <Link
          href="/exigencias/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Nova Exigência
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Descrição</th>
              <th className="text-left p-4 font-medium">Processo</th>
              <th className="text-left p-4 font-medium">Órgão</th>
              <th className="text-left p-4 font-medium">Empreendimento</th>
              <th className="text-left p-4 font-medium">Prazo</th>
              <th className="text-center p-4 font-medium">Cumprida</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {exigencias.map((e) => {
              const diasRestantes = differenceInDays(e.prazo, new Date());
              const prazoColor = e.cumprida
                ? "text-gray-500"
                : diasRestantes < 0
                  ? "text-red-600 font-medium"
                  : diasRestantes <= 7
                    ? "text-orange-600 font-medium"
                    : "text-gray-600";
              return (
                <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="p-4 max-w-xs truncate text-gray-800">{e.descricao}</td>
                  <td className="p-4 font-mono text-sm">{e.processo.numProtocolo}</td>
                  <td className="p-4 text-gray-600">{e.processo.orgao.sigla}</td>
                  <td className="p-4 text-gray-600">{e.processo.empreendimento.apelido}</td>
                  <td className={`p-4 ${prazoColor}`}>
                    {format(e.prazo, "dd/MM/yyyy", { locale: ptBR })}
                    {!e.cumprida && (
                      <span className="block text-xs">
                        {diasRestantes < 0
                          ? `Vencido há ${Math.abs(diasRestantes)} dias`
                          : `${diasRestantes} dias restantes`}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {e.cumprida ? (
                      <span className="text-emerald-600 text-lg">✓</span>
                    ) : (
                      <span className="text-gray-300 text-lg">○</span>
                    )}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/exigencias/${e.id}`}
                      className="text-emerald-700 hover:text-emerald-800 text-sm"
                    >
                      Detalhes
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {exigencias.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhuma exigência cadastrada</p>
        )}
      </div>
    </div>
  );
}
