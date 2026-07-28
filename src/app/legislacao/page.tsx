import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

const tipoColors: Record<string, string> = {
  lei: "bg-blue-100 text-blue-800",
  decreto: "bg-purple-100 text-purple-800",
  norma: "bg-green-100 text-green-800",
  resolucao: "bg-orange-100 text-orange-800",
  portaria: "bg-yellow-100 text-yellow-800",
  instrucao_normativa: "bg-indigo-100 text-indigo-800",
  outro: "bg-gray-100 text-gray-800",
};

export default async function LegislacaoPage() {
  const legislacoes = await prisma.legislacao.findMany({
    include: {
      _count: { select: { processos: true } },
    },
    orderBy: [{ data: "desc" }, { nome: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Legislação</h1>
        <Link
          href="/legislacao/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Nova Legislação
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
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
              <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium max-w-xs truncate">{l.nome}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${tipoColors[l.tipo] || "bg-gray-100 text-gray-800"}`}>
                    {l.tipo === "instrucao_normativa"
                      ? "Instrução Normativa"
                      : l.tipo.charAt(0).toUpperCase() + l.tipo.slice(1)}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{l.numero}</td>
                <td className="p-4 text-gray-600">
                  {l.data ? format(l.data, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </td>
                <td className="p-4 text-center">{l._count.processos}</td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <Link
                      href={`/legislacao/${l.id}`}
                      className="text-emerald-700 hover:text-emerald-800 text-sm"
                    >
                      Detalhes
                    </Link>
                    {l.url && (
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Link
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {legislacoes.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhuma legislação cadastrada</p>
        )}
      </div>
    </div>
  );
}
