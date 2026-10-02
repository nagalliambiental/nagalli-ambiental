import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import DeleteButton from "@/components/DeleteButton";
import { formatDate } from "@/lib/format";
import { ShieldCheck, Pencil, Eye, Download, CalendarDays, Building2, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "PGRS" };

function situacao(validade: Date | null, alertaDias: number) {
  if (!validade) return { label: "Sem validade", cls: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]" };
  const agora = new Date();
  const diffDias = Math.ceil((new Date(validade).getTime() - agora.getTime()) / 86400000);
  if (diffDias < 0) return { label: "Vencido", cls: "bg-red-100 text-red-700" };
  if (diffDias <= alertaDias) return { label: `Vence em ${diffDias}d`, cls: "bg-amber-100 text-amber-800" };
  return { label: "Vigente", cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" };
}

export default async function PgrsDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const pgrs = await prisma.pgrs.findUnique({
    where: { id: Number(id) },
    include: {
      empreendimento: { select: { id: true, apelido: true, cliente: { select: { id: true, apelido: true } } } },
      cliente: { select: { id: true, apelido: true } },
    },
  });
  if (!pgrs) notFound();

  const s = situacao(pgrs.validade, pgrs.alertaDias);
  const temArquivo = Boolean(pgrs.arquivoConteudo || pgrs.arquivoCaminho);

  return (
    <div>
      <Breadcrumbs items={[{ label: "PGRS", href: "/pgrs" }, { label: pgrs.empreendimento.apelido }]} />
      <Topbar
        icon={ShieldCheck}
        title={`PGRS — ${pgrs.empreendimento.apelido}`}
        actions={
          <div className="flex items-center gap-2">
            {temArquivo && (
              <>
                <a
                  href={`/api/pgrs/${pgrs.id}/download?inline=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                >
                  <Eye size={15} />
                  Visualizar
                </a>
                <a
                  href={`/api/pgrs/${pgrs.id}/download`}
                  className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                >
                  <Download size={15} />
                  Baixar PDF
                </a>
              </>
            )}
            <Link
              href={`/pgrs/${pgrs.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
            >
              <Pencil size={15} />
              Editar
            </Link>
            <DeleteButton entity="PGRS" endpoint={`/api/pgrs/${pgrs.id}`} redirectTo="/pgrs" />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display flex items-center gap-2 text-base font-semibold text-[var(--color-ink-900)]">
              <FileText size={16} />
              Dados do PGRS
            </h2>
            <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-[var(--color-ink-500)]">Empreendimento</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">
                <Link href={`/empreendimentos/${pgrs.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">
                  {pgrs.empreendimento.apelido}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Cliente</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">
                {pgrs.cliente ? (
                  <Link href={`/clientes/${pgrs.cliente.id}`} className="text-[var(--color-brand-600)] hover:underline">
                    {pgrs.cliente.apelido}
                  </Link>
                ) : (
                  pgrs.empreendimento.cliente?.apelido || "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Nº deferimento/protocolo</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">{pgrs.numero || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Órgão</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">{pgrs.orgao || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Deferido em</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">{pgrs.deferidoEm ? formatDate(pgrs.deferidoEm) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Validade</dt>
              <dd className="mt-0.5 flex items-center gap-2 font-medium text-[var(--color-ink-900)]">
                <CalendarDays size={14} className="text-[var(--color-ink-400)]" />
                {pgrs.validade ? formatDate(pgrs.validade) : "—"}
                {pgrs.validadeOrigem === "upload" && pgrs.validade && (
                  <span className="rounded bg-[var(--color-brand-50)] px-1.5 py-0.5 text-xs font-semibold text-[var(--color-brand-600)]">extraída do PDF</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Alerta</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">{pgrs.alertaDias} dias antes do vencimento</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-500)]">Arquivo</dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink-900)]">{pgrs.arquivoNome || "Nenhum PDF anexado"}</dd>
            </div>
            {pgrs.observacoes && (
              <div className="col-span-2">
                <dt className="text-[var(--color-ink-500)]">Observações</dt>
                <dd className="mt-0.5 whitespace-pre-wrap font-medium text-[var(--color-ink-900)]">{pgrs.observacoes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display mb-3 flex items-center gap-2 text-base font-semibold text-[var(--color-ink-900)]">
            <Building2 size={16} />
            Próximo passo
          </h2>
          <p className="text-sm text-[var(--color-ink-600)]">
            {pgrs.validade
              ? s.label === "Vencido"
                ? "PGRS vencido — inicie um novo PGRS para dar prosseguimento."
                : s.label.startsWith("Vence")
                  ? "PGRS próximo do vencimento — programe a elaboração do novo PGRS."
                  : "PGRS vigente. Acompanhe o prazo pelo dashboard de Prazos."
              : "Cadastre a validade para acompanhar o prazo de revisão deste PGRS."}
          </p>
        </div>
      </div>
    </div>
  );
}
