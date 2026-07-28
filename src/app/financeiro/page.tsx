import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

const statusPagamentoLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const statusPagamentoColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  pago: "bg-green-100 text-green-800",
  atrasado: "bg-red-100 text-red-800",
  cancelado: "bg-gray-100 text-gray-800",
};

export default async function FinanceiroPage() {
  const registros = await prisma.financeiro.findMany({
    include: {
      cliente: { select: { apelido: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <Link
          href="/financeiro/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Nova Cobrança
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Cliente</th>
              <th className="text-left p-4 font-medium">Tipo</th>
              <th className="text-right p-4 font-medium">Valor</th>
              <th className="text-left p-4 font-medium">Pagamento</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Vencimento</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium">{r.cliente.apelido}</td>
                <td className="p-4 text-gray-600">{r.tipoCobranca}</td>
                <td className="p-4 text-right font-medium">
                  {r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className="p-4 text-gray-600">{r.formaPagamento || "—"}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusPagamentoColors[r.statusPagamento] || "bg-gray-100 text-gray-800"}`}>
                    {statusPagamentoLabels[r.statusPagamento] || r.statusPagamento}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {r.dataVencimento ? format(r.dataVencimento, "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </td>
                <td className="p-4">
                  <Link
                    href={`/financeiro/${r.id}`}
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {registros.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum registro financeiro encontrado</p>
        )}
      </div>
    </div>
  );
}
