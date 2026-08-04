import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Building2, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { UltimaModificacao } from "@/components/UltimaModificacao";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", enviada: "Enviada", aprovada: "Aprovada", rejeitada: "Rejeitada",
};

const statusColors: Record<string, string> = {
  rascunho: "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]",
  enviada: "bg-blue-50 text-blue-800",
  aprovada: "bg-green-50 text-green-800",
  rejeitada: "bg-red-50 text-red-800",
};

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const p = await prisma.proposta.findUnique({ where: { id: Number(id) } });
  return { title: `Proposta — ${p?.titulo || "Não encontrada"}` };
}

export default async function PropostaDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const proposta = await prisma.proposta.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { id: true, apelido: true, razaoSocial: true } },
      empreendimento: { select: { id: true, apelido: true } },
    },
  });
  if (!proposta) notFound();

  const servicos = (proposta.servicos as Array<{ descricao: string; valor: number }> | null) || [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Propostas", href: "/propostas" }, { label: proposta.titulo }]} />
      <Topbar
        title={proposta.titulo}
        subtitle={`Cliente: ${proposta.cliente.apelido}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/propostas/${proposta.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              Editar
            </Link>
            <DeleteButton entity="Proposta" endpoint={`/api/propostas/${proposta.id}`} redirectTo="/propostas" />
          </div>
        }
      />
      <UltimaModificacao entidade="proposta" entidadeId={proposta.id} />
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Dados da Proposta</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <FileText size={16} />
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[proposta.status] || ""}`}>{statusLabels[proposta.status] || proposta.status}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Building2 size={16} />
              <Link href={`/clientes/${proposta.cliente.id}`} className="text-[var(--color-brand-600)] hover:underline">{proposta.cliente.apelido}</Link>
            </div>
            {proposta.empreendimento && (
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Building2 size={16} />
                <Link href={`/empreendimentos/${proposta.empreendimento.id}`} className="text-[var(--color-brand-600)] hover:underline">{proposta.empreendimento.apelido}</Link>
              </div>
            )}
            {proposta.valor != null && (
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <DollarSign size={16} />
                <span className="font-medium text-[var(--color-ink-900)]">R$ {proposta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Calendar size={16} />
              <span>Validade: {proposta.validadeDias} dias</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
              <Calendar size={16} />
              <span>Criado: {format(proposta.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </div>
        {servicos.length > 0 && (
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Serviços</h2>
            <div className="space-y-2">
              {servicos.map((s, i) => (
                <div key={i} className="flex items-center justify-between border-b border-[var(--color-paper-100)] pb-2 last:border-0">
                  <span className="text-sm text-[var(--color-ink-700)]">{s.descricao}</span>
                  {s.valor != null && <span className="text-sm font-medium text-[var(--color-ink-900)]">R$ {s.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {proposta.observacoes && (
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 lg:col-span-2">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-2">Observações</h2>
            <p className="text-sm text-[var(--color-ink-700)] whitespace-pre-wrap">{proposta.observacoes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
