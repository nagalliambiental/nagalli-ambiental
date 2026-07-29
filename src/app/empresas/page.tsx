import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/Topbar";

export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      updatedAt: true,
      _count: { select: { documentosGerados: true } },
    },
  });

  return (
    <div>
      <Topbar
        title="Clientes"
        subtitle={`${empresas.length} cliente(s) cadastrado(s)`}
        actions={
          <Link
            href="/empresas/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} strokeWidth={2.5} />
            Novo cliente
          </Link>
        }
      />
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-paper-200)] text-left">
              <th className="px-4 py-3 font-medium text-[var(--color-ink-700)]">Razão Social</th>
              <th className="px-4 py-3 font-medium text-[var(--color-ink-700)]">Nome Fantasia</th>
              <th className="px-4 py-3 font-medium text-[var(--color-ink-700)]">CNPJ</th>
              <th className="px-4 py-3 font-medium text-[var(--color-ink-700)]">Documentos</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b border-[var(--color-paper-200)] last:border-0 hover:bg-[var(--color-paper-50)]">
                <td className="px-4 py-3">
                  <Link href={`/empresas/${e.id}`} className="font-medium text-[var(--color-brand-600)] hover:underline">
                    {e.razaoSocial}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink-500)]">{e.nomeFantasia || "—"}</td>
                <td className="px-4 py-3 text-[var(--color-ink-500)]">{e.cnpj}</td>
                <td className="px-4 py-3 text-[var(--color-ink-500)]">{e._count.documentosGerados}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-ink-500)]">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
