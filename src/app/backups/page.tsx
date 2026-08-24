import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DatabaseBackup, Download } from "lucide-react";
import GerarBackupButton from "@/components/GerarBackupButton";
import ExcluirBackupButton from "@/components/ExcluirBackupButton";
import { formatDataHora, formatTamanho } from "./lib";

export const dynamic = "force-dynamic";

export const metadata = { title: "Backups" };

export default async function BackupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const perfil = (session.user as { perfil?: string }).perfil;
  if (perfil !== "socio" && perfil !== "admin") redirect("/");

  const backups = await prisma.backup.findMany({
    orderBy: { criadoEm: "desc" },
    include: { usuario: { select: { nome: true } } },
    take: 100,
  });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Backups" }]} />
      <Topbar
        icon={DatabaseBackup}
        title="Backups"
        subtitle="Histórico de backups gerados automaticamente pelo sistema"
        actions={<GerarBackupButton />}
      />

      {backups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-[var(--color-ink-500)]">
          <DatabaseBackup size={28} />
          <p className="text-sm">Nenhum backup registrado ainda.</p>
        </div>
      ) : (
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="hidden md:table-cell px-3 py-3 font-medium">Origem</th>
                  <th className="hidden md:table-cell px-3 py-3 font-medium">Gerado por</th>
                  <th className="hidden lg:table-cell px-3 py-3 font-medium">Tamanho</th>
                  <th className="px-3 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--color-paper-200)] last:border-0 hover:bg-[var(--color-paper-50)] transition-colors">
                    <td className="px-3 py-3 text-[var(--color-ink-800)]">{formatDataHora(b.criadoEm)}</td>
                    <td className="hidden md:table-cell px-3 py-3">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${b.origem === "manual" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                        {b.origem === "manual" ? "Manual" : "Automático"}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-3 text-[var(--color-ink-600)]"><span className="block max-w-[180px] truncate" title={b.usuario?.nome || undefined}>{b.usuario?.nome || "—"}</span></td>
                    <td className="hidden lg:table-cell px-3 py-3 text-[var(--color-ink-600)]">{formatTamanho(b.tamanho)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/backups/${b.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                          title="Baixar backup"
                        >
                          <Download size={14} /> Baixar
                        </a>
                        <ExcluirBackupButton id={b.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
