import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { UltimaModificacao } from "@/components/UltimaModificacao";
import DeleteButton from "@/components/DeleteButton";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck, Building2, FileText, Calendar, Pencil, ArrowLeft, RefreshCw, Download, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "TPP" };

const ALERTA_DIAS = 15;

function situacao(validade: Date) {
  const diff = differenceInDays(validade, new Date());
  if (diff < 0) return { label: `Vencida há ${Math.abs(diff)}d`, cls: "bg-red-100 text-red-700" };
  if (diff <= ALERTA_DIAS) return { label: `Vence em ${diff}d`, cls: "bg-amber-100 text-amber-700" };
  return { label: "Vigente", cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]" };
}

export default async function TppDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const registro = await prisma.autorizacaoTpp.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { id: true, apelido: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });
  if (!registro) notFound();

  const s = situacao(registro.dataValidade);

  return (
    <div>
      <Breadcrumbs items={[{ label: "TPP", href: "/tpp" }, { label: registro.numero }]} />

      <div className="mb-4">
        <Link href="/tpp" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para TPPs
        </Link>
      </div>

      <Topbar
        icon={Truck}
        title={`TPP ${registro.numero}`}
        subtitle={registro.cliente.apelido}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/tpp/novo?renovar=${registro.id}`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-river-700)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-river-500)]"
            >
              <RefreshCw size={14} />
              Renovar
            </Link>
            <Link
              href={`/tpp/${registro.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Pencil size={14} />
              Editar
            </Link>
            <DeleteButton entity="TPP" endpoint={`/api/tpp/${registro.id}`} redirectTo="/tpp" />
          </div>
        }
      />

      <UltimaModificacao entidade="autorizacaoTpp" entidadeId={registro.id} />

      {!registro.ativo && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={16} />
          Esta autorização está marcada como inativa.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display mb-4 text-base font-semibold text-[var(--color-ink-900)]">Informações</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Building2 size={16} />
              <Link href={`/clientes/${registro.cliente.id}`} className="font-medium text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)] hover:underline">
                {registro.cliente.apelido}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Building2 size={16} />
              {registro.empreendimento ? (
                <Link href={`/empreendimentos/${registro.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">
                  {registro.empreendimento.apelido}
                </Link>
              ) : (
                <span>Sem vínculo</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <FileText size={16} />
              <span>Nº de registro: <span className="font-mono font-medium text-[var(--color-ink-900)]">{registro.numero}</span></span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
            </div>
          </div>
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display mb-4 text-base font-semibold text-[var(--color-ink-900)]">Vigência</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Calendar size={16} />
              <span>Emitido em: <span className="font-medium text-[var(--color-ink-900)]">{format(registro.dataEmissao, "dd/MM/yyyy", { locale: ptBR })}</span></span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Calendar size={16} />
              <span>Válido até: <span className="font-medium text-[var(--color-ink-900)]">{format(registro.dataValidade, "dd/MM/yyyy", { locale: ptBR })}</span></span>
            </div>
            {registro.arquivoNome && (
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <FileText size={16} />
                <a href={`/api/tpp/${registro.id}/arquivo`} className="flex items-center gap-1.5 font-medium text-[var(--color-brand-600)] hover:underline" title="Baixar PDF">
                  <Download size={14} />
                  {registro.arquivoNome}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display mb-4 text-base font-semibold text-[var(--color-ink-900)]">Veículos</h2>
          {registro.veiculos ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-ink-700)]">{registro.veiculos}</pre>
          ) : (
            <p className="text-sm text-[var(--color-ink-500)]">Nenhum veículo informado.</p>
          )}
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display mb-4 text-base font-semibold text-[var(--color-ink-900)]">Classes de risco</h2>
          {registro.classesRisco ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-ink-700)]">{registro.classesRisco}</pre>
          ) : (
            <p className="text-sm text-[var(--color-ink-500)]">Nenhuma classe informada.</p>
          )}
        </div>
      </div>

      {registro.observacoes && (
        <div className="shadow-card mt-4 rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display mb-2 text-base font-semibold text-[var(--color-ink-900)]">Observações</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-ink-700)]">{registro.observacoes}</pre>
        </div>
      )}
    </div>
  );
}