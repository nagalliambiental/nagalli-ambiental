import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EmpreendimentosPage() {
  const empreendimentos = await prisma.empreendimento.findMany({
    include: {
      cliente: { select: { apelido: true } },
      _count: { select: { processos: true } },
    },
    orderBy: { apelido: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Empreendimentos</h1>
        <Link
          href="/empreendimentos/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Novo Empreendimento
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Apelido</th>
              <th className="text-left p-4 font-medium">Cliente</th>
              <th className="text-left p-4 font-medium">Endereço</th>
              <th className="text-center p-4 font-medium">Processos</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empreendimentos.map((e) => (
              <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium">{e.apelido}</td>
                <td className="p-4 text-gray-600">{e.cliente.apelido}</td>
                <td className="p-4 text-gray-600 max-w-xs truncate">{e.endereco}</td>
                <td className="p-4 text-center">{e._count.processos}</td>
                <td className="p-4">
                  <Link
                    href={`/empreendimentos/${e.id}`}
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {empreendimentos.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum empreendimento cadastrado</p>
        )}
      </div>
    </div>
  );
}
