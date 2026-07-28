import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  protocolado: "Protocolado",
  em_andamento: "Em Andamento",
  exigencia_recebida: "Exigência Recebida",
  deferido: "Deferido",
  indeferido: "Indeferido",
  arquivado: "Arquivado",
};

const statusColors: Record<string, string> = {
  protocolado: "bg-blue-100 text-blue-800",
  em_andamento: "bg-yellow-100 text-yellow-800",
  exigencia_recebida: "bg-orange-100 text-orange-800",
  deferido: "bg-green-100 text-green-800",
  indeferido: "bg-red-100 text-red-800",
  arquivado: "bg-gray-100 text-gray-800",
};

export default async function ProcessosPage() {
  const processos = await prisma.processo.findMany({
    include: {
      orgao: { select: { sigla: true } },
      empreendimento: { select: { apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Processos</h1>
        <Link
          href="/processos/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Novo Processo
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Protocolo</th>
              <th className="text-left p-4 font-medium">Tipo</th>
              <th className="text-left p-4 font-medium">Órgão</th>
              <th className="text-left p-4 font-medium">Empreendimento</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Validade</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {processos.map((p) => (
              <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-mono text-sm">{p.numProtocolo}</td>
                <td className="p-4 text-gray-600">{p.tipo}</td>
                <td className="p-4 font-medium">{p.orgao.sigla}</td>
                <td className="p-4 text-gray-600">{p.empreendimento.apelido}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-800"}`}>
                    {statusLabels[p.status] || p.status}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {p.validade ? format(p.validade, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </td>
                <td className="p-4">
                  <Link
                    href={`/processos/${p.id}`}
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {processos.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum processo cadastrado</p>
        )}
      </div>
    </div>
  );
}
