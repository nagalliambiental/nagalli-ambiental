import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Plus, Inbox, Eye, Map } from "lucide-react";
import RowActions from "@/components/RowActions";

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
    <div>
      <Topbar
        title="Empreendimentos"
        actions={
          <Link
            href="/empreendimentos/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Novo Empreendimento
          </Link>
        }
      />

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {empreendimentos.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                <th className="text-left p-4 font-medium">Apelido</th>
                <th className="text-left p-4 font-medium">Cliente</th>
                <th className="text-left p-4 font-medium">Endereço</th>
                <th className="text-center p-4 font-medium">Processos</th>
                <th className="text-left p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {empreendimentos.map((e) => (
                <tr key={e.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                  <td className="p-4 font-medium text-[var(--color-ink-900)]">{e.apelido}</td>
                  <td className="p-4">{e.cliente.apelido}</td>
                  <td className="p-4 max-w-xs truncate">{[e.rua, e.numero, e.bairro].filter(Boolean).join(", ") || e.municipio || "-"}</td>
                  <td className="p-4 text-center">{e._count.processos}</td>
                  <td className="p-4">
                    <RowActions detailUrl={`/empreendimentos/${e.id}`} entity="empreendimento" entityName="Empreendimento" endpoint={`/api/empreendimentos/${e.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-ink-500)]">
            <div className="rounded-lg bg-[var(--color-paper-100)] p-3">
              <Map size={24} />
            </div>
            <p className="text-sm">Nenhum empreendimento cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
