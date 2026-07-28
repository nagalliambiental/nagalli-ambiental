import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

async function getDashboardData() {
  const [
    totalProcessos,
    processosPorStatus,
    processosVencendo,
    totalClientes,
    totalEmpreendimentos,
    exigenciasPendentes,
    orgaos,
  ] = await Promise.all([
    prisma.processo.count(),
    prisma.processo.groupBy({ by: ["status"], _count: true }),
    prisma.processo.findMany({
      where: {
        validade: {
          not: null,
          gte: new Date(),
          lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        empreendimento: { select: { apelido: true } },
        orgao: { select: { sigla: true } },
      },
      orderBy: { validade: "asc" },
    }),
    prisma.cliente.count(),
    prisma.empreendimento.count(),
    prisma.exigencia.count({ where: { cumprida: false } }),
    prisma.orgao.findMany({ include: { _count: { select: { processos: true } } } }),
  ]);

  return {
    totalProcessos,
    processosPorStatus,
    processosVencendo,
    totalClientes,
    totalEmpreendimentos,
    exigenciasPendentes,
    orgaos,
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-3xl font-bold text-emerald-700">{data.totalProcessos}</div>
          <div className="text-sm text-gray-500 mt-1">Total de Processos</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-3xl font-bold text-blue-700">{data.totalClientes}</div>
          <div className="text-sm text-gray-500 mt-1">Clientes</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-3xl font-bold text-purple-700">{data.totalEmpreendimentos}</div>
          <div className="text-sm text-gray-500 mt-1">Empreendimentos</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-3xl font-bold text-orange-700">{data.exigenciasPendentes}</div>
          <div className="text-sm text-gray-500 mt-1">Exigências Pendentes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Processos por Status</h2>
          <div className="space-y-3">
            {data.processosPorStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[s.status] || "bg-gray-100 text-gray-800"}`}>
                  {statusLabels[s.status] || s.status}
                </span>
                <span className="text-sm font-medium text-gray-700">{s._count}</span>
              </div>
            ))}
            {data.processosPorStatus.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum processo cadastrado</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Prazos a Vencer (15 dias)</h2>
          <div className="space-y-3">
            {data.processosVencendo.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-gray-50 pb-2">
                <div>
                  <Link href={`/processos/${p.id}`} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                    {p.numProtocolo}
                  </Link>
                  <p className="text-xs text-gray-400">{p.empreendimento.apelido} - {p.orgao.sigla}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">
                    {p.validade ? format(p.validade, "dd/MM") : "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.validade ? `${differenceInDays(p.validade, new Date())} dias` : "—"}
                  </p>
                </div>
              </div>
            ))}
            {data.processosVencendo.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum prazo próximo do vencimento</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Órgãos Ambientais</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.orgaos.map((o) => (
            <div key={o.id} className="border border-gray-100 rounded-lg p-4 text-center">
              <div className="text-lg font-bold text-emerald-700">{o._count.processos}</div>
              <div className="text-sm font-medium text-gray-700">{o.sigla}</div>
              <div className="text-xs text-gray-400">{o.nome}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
