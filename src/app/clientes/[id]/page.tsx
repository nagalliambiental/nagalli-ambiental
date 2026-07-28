import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Mail, Phone, User, FileText, MapPin, Map, Globe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { empreendimentos: true, financeiros: true } } },
  });
  if (!cliente) notFound();

  return (
    <div>
      <Topbar title={cliente.apelido} subtitle="Detalhes do cliente" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Building2 size={16} />
                <span className="text-[var(--color-ink-900)]">{cliente.razaoSocial}</span>
              </div>
              {cliente.nomeFantasia && (
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <FileText size={16} />
                  <span>{cliente.nomeFantasia}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Mail size={16} />
                <span>{cliente.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <Phone size={16} />
                <span>{cliente.telefone}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <User size={16} />
                <span>Resp.: {cliente.respLegal}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                <FileText size={16} />
                <span className="font-mono">{cliente.cnpj}</span>
              </div>
            </div>
          </div>

          {(cliente.endereco || cliente.cep || cliente.municipio || cliente.uf) && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-[var(--color-ink-500)]" />
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Endereço</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {cliente.endereco && <div className="col-span-2 text-[var(--color-ink-700)]">{cliente.endereco}</div>}
                {cliente.cep && <div className="text-[var(--color-ink-500)]">CEP: {cliente.cep}</div>}
                {cliente.municipio && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Map size={14} />{cliente.municipio}</div>}
                {cliente.uf && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Globe size={14} />{cliente.uf}</div>}
              </div>
            </div>
          )}

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Atividades</h2>
            <div className="space-y-2 text-sm">
              <Link href={`/empreendimentos?clienteId=${cliente.id}`} className="block text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
                {cliente._count.empreendimentos} empreendimento(s) →
              </Link>
              <Link href={`/financeiro?clienteId=${cliente.id}`} className="block text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
                {cliente._count.financeiros} registro(s) financeiro(s) →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Cadastro</h2>
            <p className="text-sm text-[var(--color-ink-500)]">
              {format(cliente.criadoEm, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/clientes" className="focus-ring transition-brand flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Voltar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
