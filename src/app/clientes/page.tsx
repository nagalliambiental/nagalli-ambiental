import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: { _count: { select: { empreendimentos: true } } },
    orderBy: { apelido: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Novo Cliente
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Apelido</th>
              <th className="text-left p-4 font-medium">Razão Social</th>
              <th className="text-left p-4 font-medium">CNPJ</th>
              <th className="text-left p-4 font-medium">Contato</th>
              <th className="text-center p-4 font-medium">Empreendimentos</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium">{c.apelido}</td>
                <td className="p-4 text-gray-600">{c.razaoSocial}</td>
                <td className="p-4 text-gray-600">{c.cnpj}</td>
                <td className="p-4">
                  <div className="text-gray-600">{c.email}</div>
                  <div className="text-gray-400 text-xs">{c.telefone}</div>
                </td>
                <td className="p-4 text-center">{c._count.empreendimentos}</td>
                <td className="p-4">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clientes.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum cliente cadastrado</p>
        )}
      </div>
    </div>
  );
}
