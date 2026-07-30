import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Eye, Users, Check, X } from "lucide-react";
import RowActions from "@/components/RowActions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuários" };

const perfilLabels: Record<string, string> = {
  socio: "Sócio",
  tecnico: "Técnico",
  admin: "Administrador",
};

const perfilColors: Record<string, string> = {
  socio: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
  tecnico: "bg-[var(--color-river-100)] text-[var(--color-river-700)]",
  admin: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]",
};

export default async function UsuariosPage() {
  const usuarios = await prisma.usuario.findMany({
    include: {
      _count: { select: { tarefas: true } },
    },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Usuários" }]} />
      <Topbar
        title="Usuários"
        actions={
          <Link
            href="/usuarios/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Novo Usuário
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {usuarios.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
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
                <tr key={u.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-medium text-[var(--color-ink-900)]">{u.nome}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${perfilColors[u.perfil] || "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"}`}>
                      {perfilLabels[u.perfil] || u.perfil}
                    </span>
                  </td>
                  <td className="p-4 text-center">{u._count.tarefas}</td>
                  <td className="p-4 text-center">
                    {u.ativo ? (
                      <Check size={18} className="text-[var(--color-brand-600)]" />
                    ) : (
                      <X size={18} className="text-[var(--color-river-700)]" />
                    )}
                  </td>
                  <td className="p-4">
                    <RowActions detailUrl={`/usuarios/${u.id}`} editUrl={`/usuarios/${u.id}`} entity="usuario" entityName="Usuário" endpoint={`/api/usuarios/${u.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <Users size={24} />
            </div>
            <p className="text-sm">Nenhum usuário cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
