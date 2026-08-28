import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatCard } from "@/components/StatCard";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Truck, CheckCircle2, CalendarClock, AlertTriangle, FileText, Pencil, RefreshCw } from "lucide-react";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "TPP" };

const ALERTA_DIAS = 15;

function situacao(validade: Date, hoje: Date) {
  const diff = differenceInDays(validade, hoje);
  if (diff < 0) return { label: `Vencida há ${Math.abs(diff)}d`, cls: "bg-red-100 text-red-700" };
  if (diff <= ALERTA_DIAS) return { label: `Vence em ${diff}d`, cls: "bg-amber-100 text-amber-700" };
  return { label: "Vigente", cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" };
}

export default async function TppPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const registros = await prisma.autorizacaoTpp.findMany({
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
    orderBy: [{ ativo: "desc" }, { dataValidade: "asc" }],
  });

  const hoje = new Date();
  const aVencer = registros.filter(
    (r) => r.ativo && r.dataValidade >= hoje && differenceInDays(r.dataValidade, hoje) <= ALERTA_DIAS
  ).length;
  const vencidas = registros.filter((r) => r.ativo && r.dataValidade < hoje).length;
  const vigentes = registros.filter((r) => r.ativo && r.dataValidade >= hoje).length;

  return (
    <div>
      <Breadcrumbs items={[{ label: "TPP" }]} />
      <Topbar
        icon={Truck}
        title="TPP — Produtos Perigosos"
        subtitle="Controle de prazos das autorizações de transporte de produtos perigosos"
        actions={
          <Link
            href="/tpp/novo"
            className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
          >
            <Plus size={16} />
            Nova TPP
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Autorizações" value={registros.length} icon={Truck} accent="brand" />
        <StatCard label="Vigentes" value={vigentes} icon={CheckCircle2} accent="success" />
        <StatCard label={`A vencer em ${ALERTA_DIAS} dias`} value={aVencer} icon={CalendarClock} accent="warning" />
        <StatCard label="Vencidas" value={vencidas} icon={AlertTriangle} accent="danger" />
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
        {registros.length === 0 ? (
          <div className="p-10 text-center">
            <Truck size={32} className="mx-auto text-[var(--color-ink-300)]" />
            <p className="mt-3 text-sm text-[var(--color-ink-500)]">
              Nenhuma autorização cadastrada. Clique em <span className="font-medium">Nova TPP</span> para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left text-[var(--color-ink-500)]">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Empreendimento</th>
                  <th className="px-5 py-3 font-medium">Nº registro</th>
                  <th className="px-5 py-3 font-medium">Emitido em</th>
                  <th className="px-5 py-3 font-medium">Válido até</th>
                  <th className="px-5 py-3 font-medium">Situação</th>
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => {
                  const s = situacao(r.dataValidade, hoje);
                  return (
                    <tr key={r.id} className={`border-b border-[var(--color-paper-100)] ${!r.ativo ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3">
                        <Link href={`/clientes/${r.cliente.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">
                          {r.cliente.apelido}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[var(--color-ink-700)]">
                        {r.empreendimento ? r.empreendimento.apelido : "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-[var(--color-ink-900)]">{r.numero}</td>
                      <td className="px-5 py-3 text-[var(--color-ink-600)]">{format(r.dataEmissao, "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td className="px-5 py-3 text-[var(--color-ink-600)]">{format(r.dataValidade, "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/tpp/${r.id}`} className="rounded-md p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]" title="Ver">
                            <FileText size={16} />
                          </Link>
                          <Link href={`/tpp/${r.id}/editar`} className="rounded-md p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]" title="Editar">
                            <Pencil size={16} />
                          </Link>
                          <Link href={`/tpp/novo?renovar=${r.id}`} className="rounded-md p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]" title="Renovar">
                            <RefreshCw size={16} />
                          </Link>
                          <DeleteButton entity="TPP" endpoint={`/api/tpp/${r.id}`} redirectTo="/tpp" iconOnly />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}