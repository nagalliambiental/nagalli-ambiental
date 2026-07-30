import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Check, Clock, FileText, Calendar } from "lucide-react";
import Link from "next/link";
import EntityActions from "@/components/EntityActions";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Exigência" };
}

export default async function ExigenciaDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const exigencia = await prisma.exigencia.findUnique({
    where: { id: Number(id) },
    include: {
      processo: {
        select: {
          numProtocolo: true,
          id: true,
          tipo: true,
          orgao: { select: { sigla: true } },
          empreendimento: { select: { apelido: true, id: true } },
        },
      },
      _count: { select: { documentos: true } },
    },
  });
  if (!exigencia) notFound();

  const diasRestantes = differenceInDays(exigencia.prazo, new Date());
  const isVencido = diasRestantes < 0;

  return (
    <div>
      <Breadcrumbs items={[{ label: "Exigências", href: "/exigencias" }, { label: "Exigência" }]} />
      <Topbar title="Exigência" subtitle={exigencia.descricao.length > 60 ? exigencia.descricao.slice(0, 60) + "..." : exigencia.descricao} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Descrição</h2>
            <p className="text-sm text-[var(--color-ink-700)]">{exigencia.descricao}</p>
          </div>

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Processo</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <FileText size={16} />
                <Link href={`/processos/${exigencia.processo.id}`} className="font-mono text-[var(--color-brand-600)] hover:underline">{exigencia.processo.numProtocolo}</Link>
              </div>
              <div className="text-[var(--color-ink-500)]">{exigencia.processo.tipo}</div>
              <div className="text-[var(--color-ink-500)]">Órgão: {exigencia.processo.orgao.sigla}</div>
              <div className="text-[var(--color-ink-500)]">Empreendimento: {exigencia.processo.empreendimento.apelido}</div>
            </div>
          </div>

          {exigencia._count.documentos > 0 && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Documentos</h2>
              <p className="text-sm text-[var(--color-ink-500)]">{exigencia._count.documentos} documento(s) vinculado(s).</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={`shadow-card rounded-[var(--radius-card)] border p-5 ${isVencido ? "border-[var(--color-river-700)] bg-[var(--color-river-100)]" : "border-[var(--color-paper-200)] bg-white"}`}>
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Prazo</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[var(--color-ink-500)]" />
                <span className={isVencido ? "text-[var(--color-river-700)] font-medium" : ""}>
                  {format(exigencia.prazo, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isVencido ? (
                  <><AlertTriangle size={16} className="text-[var(--color-river-700)]" /><span className="text-[var(--color-river-700)] font-medium">Vencido há {Math.abs(diasRestantes)} dias</span></>
                ) : (
                  <><Clock size={16} className="text-[var(--color-ink-500)]" /><span>{diasRestantes} dias restantes</span></>
                )}
              </div>
              <div className="flex items-center gap-2">
                {exigencia.cumprida ? (
                  <><Check size={16} className="text-[var(--color-brand-600)]" /><span className="text-[var(--color-brand-600)]">Cumprida</span></>
                ) : (
                  <><AlertTriangle size={16} className="text-[var(--color-river-700)]" /><span className="text-[var(--color-river-700)]">Pendente</span></>
                )}
              </div>
              <div className="text-[var(--color-ink-500)]">Antecedência: {exigencia.antecedenciaDias} dias</div>
            </div>
          </div>

          <Link href="/exigencias" className="focus-ring transition-brand block rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
            Voltar
          </Link>

          <EntityActions
            entity="exigencia"
            entityName="Exigência"
            endpoint={`/api/exigencias/${exigencia.id}`}
            redirectTo="/exigencias"
            fields={[
              { name: "descricao", label: "Descrição", type: "textarea", required: true },
              { name: "prazo", label: "Prazo", type: "date", required: true },
              { name: "antecedenciaDias", label: "Antecedência (dias)", type: "number", required: true },
              { name: "cumprida", label: "Cumprida", type: "select", options: [
                { value: "true", label: "Sim" },
                { value: "false", label: "Não" },
              ] },
            ]}
            data={{
              descricao: exigencia.descricao,
              prazo: exigencia.prazo.toISOString(),
              antecedenciaDias: exigencia.antecedenciaDias,
              cumprida: exigencia.cumprida ? "true" : "false",
            }}
          />
        </div>
      </div>
    </div>
  );
}
