import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_andamento: "bg-blue-100 text-blue-800",
  concluida: "bg-green-100 text-green-800",
  cancelada: "bg-gray-100 text-gray-800",
};

const prioridadeLabels: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const prioridadeColors: Record<string, string> = {
  baixa: "text-gray-500",
  media: "text-blue-600",
  alta: "text-orange-600",
  urgente: "text-red-600 font-medium",
};

export default async function TarefasPage() {
  const tarefas = await prisma.tarefa.findMany({
    include: {
      responsavel: { select: { nome: true } },
      usuario: { select: { nome: true } },
    },
    orderBy: [
      { status: "asc" },
      { prioridade: "desc" },
      { dataVencimento: "asc" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
        <Link
          href="/tarefas/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Nova Tarefa
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Título</th>
              <th className="text-left p-4 font-medium">Prioridade</th>
              <th className="text-left p-4 font-medium">Responsável</th>
              <th className="text-left p-4 font-medium">Criador</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Vencimento</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tarefas.map((t) => (
              <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium max-w-xs truncate">{t.titulo}</td>
                <td className="p-4">
                  <span className={`text-sm font-medium ${prioridadeColors[t.prioridade] || "text-gray-600"}`}>
                    {prioridadeLabels[t.prioridade] || t.prioridade}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{t.responsavel.nome}</td>
                <td className="p-4 text-gray-600">{t.usuario.nome}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-800"}`}>
                    {statusLabels[t.status] || t.status}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {t.dataVencimento
                    ? format(t.dataVencimento, "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </td>
                <td className="p-4">
                  <Link
                    href={`/tarefas/${t.id}`}
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tarefas.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhuma tarefa cadastrada</p>
        )}
      </div>
    </div>
  );
}
