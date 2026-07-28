import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const perfilLabels: Record<string, string> = {
  socio: "Sócio",
  tecnico: "Técnico",
  admin: "Administrador",
};

const perfilColors: Record<string, string> = {
  socio: "bg-purple-100 text-purple-800",
  tecnico: "bg-blue-100 text-blue-800",
  admin: "bg-emerald-100 text-emerald-800",
};

export default async function UsuariosPage() {
  const usuarios = await prisma.usuario.findMany({
    include: {
      _count: { select: { tarefas: true } },
    },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <Link
          href="/usuarios/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Novo Usuário
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Nome</th>
              <th className="text-left p-4 font-medium">Email</th>
              <th className="text-left p-4 font-medium">Perfil</th>
              <th className="text-center p-4 font-medium">Tarefas</th>
              <th className="text-center p-4 font-medium">Ativo</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium">{u.nome}</td>
                <td className="p-4 text-gray-600">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${perfilColors[u.perfil] || "bg-gray-100 text-gray-800"}`}>
                    {perfilLabels[u.perfil] || u.perfil}
                  </span>
                </td>
                <td className="p-4 text-center">{u._count.tarefas}</td>
                <td className="p-4 text-center">
                  {u.ativo ? (
                    <span className="text-emerald-600 text-lg">✓</span>
                  ) : (
                    <span className="text-red-400 text-lg">✕</span>
                  )}
                </td>
                <td className="p-4">
                  <Link
                    href={`/usuarios/${u.id}`}
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usuarios.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum usuário cadastrado</p>
        )}
      </div>
    </div>
  );
}
