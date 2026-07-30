export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Map, MapPin, Building2, Calendar, FileText, ClipboardList } from "lucide-react";
import Link from "next/link";
import EntityActions from "@/components/EntityActions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { HistoricoTab } from "@/components/HistoricoTab";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const emp = await prisma.empreendimento.findUnique({
    where: { id: Number(id) },
    select: { apelido: true, cliente: { select: { apelido: true } } },
  });
  return { title: `Empreendimento - ${emp?.apelido}` };
}

export default async function EmpreendimentoDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const emp = await prisma.empreendimento.findUnique({
    where: { id: Number(id) },
    include: {
      cliente: { select: { apelido: true, id: true } },
      _count: { select: { processos: true } },
    },
  });
  if (!emp) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Empreendimentos", href: "/empreendimentos" }, { label: emp.apelido }]} />
      <Topbar title={emp.apelido} subtitle="Detalhes do empreendimento" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Building2 size={16} />
                  <span className="text-[var(--color-ink-900)]">{emp.cliente.apelido}</span>
                </div>
                {emp.cnpj && <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <FileText size={16} />
                  <span className="font-mono">{emp.cnpj}</span>
                </div>}
                <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                  <Calendar size={16} />
                  <span>Cadastro em {format(emp.criadoEm, "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-[var(--color-ink-700)]">{emp.descricao}</p>
            </div>

            {(emp.rua || emp.cep || emp.municipio || emp.uf) && (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={18} className="text-[var(--color-ink-500)]" />
                  <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Endereço</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {emp.rua && <div className="col-span-2 text-[var(--color-ink-700)]">
                    {emp.rua}{emp.numero ? `, ${emp.numero}` : ""}
                  </div>}
                  {emp.bairro && <div className="text-[var(--color-ink-500)]">Bairro: {emp.bairro}</div>}
                  {emp.complemento && <div className="text-[var(--color-ink-500)]">Complemento: {emp.complemento}</div>}
                  {emp.cep && <div className="text-[var(--color-ink-500)]">CEP: {emp.cep}</div>}
                  {emp.municipio && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Map size={14} />{emp.municipio}</div>}
                  {emp.uf && <div className="flex items-center gap-1 text-[var(--color-ink-500)]">{emp.uf}</div>}
                </div>
              </div>
            )}

          {emp.latitude && emp.longitude && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Map size={18} className="text-[var(--color-ink-500)]" />
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Geolocalização</h2>
              </div>
              <p className="text-sm text-[var(--color-ink-500)]">Lat: {emp.latitude} / Lon: {emp.longitude}</p>
            </div>
          )}

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Processos</h2>
            <p className="text-sm text-[var(--color-ink-500)]">{emp._count.processos} processo(s) vinculado(s).</p>
            <Link href={`/processos?empreendimentoId=${emp.id}`} className="focus-ring transition-brand mt-3 inline-flex text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
              Ver processos →
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Resumo</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--color-ink-500)]">Processos</span><span className="font-medium">{emp._count.processos}</span></div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/clientes/${emp.cliente.id}`} className="focus-ring transition-brand flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Cliente
            </Link>
            <Link href="/empreendimentos" className="focus-ring transition-brand flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Voltar
            </Link>
          </div>

          <EntityActions
            entity="empreendimento"
            entityName="Empreendimento"
            endpoint={`/api/empreendimentos/${emp.id}`}
            redirectTo="/empreendimentos"
            fields={[
              { name: "apelido", label: "Apelido", type: "text", required: true },
              { name: "cnpj", label: "CNPJ", type: "text" },
              { name: "cep", label: "CEP", type: "text" },
              { name: "municipio", label: "Município", type: "text" },
              { name: "uf", label: "UF", type: "text" },
              { name: "rua", label: "Rua", type: "text" },
              { name: "numero", label: "Número", type: "text" },
              { name: "bairro", label: "Bairro", type: "text" },
              { name: "complemento", label: "Complemento", type: "text" },
              { name: "descricao", label: "Descrição", type: "textarea" },
              { name: "latitude", label: "Latitude", type: "number" },
              { name: "longitude", label: "Longitude", type: "number" },
            ]}
            data={{
              apelido: emp.apelido,
              cnpj: emp.cnpj,
              cep: emp.cep,
              municipio: emp.municipio,
              uf: emp.uf,
              rua: emp.rua,
              numero: emp.numero,
              bairro: emp.bairro,
              complemento: emp.complemento,
              descricao: emp.descricao,
              latitude: emp.latitude,
              longitude: emp.longitude,
            }}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={20} className="text-[var(--color-brand-500)]" />
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Histórico</h2>
        </div>
        <HistoricoTab empreendimentoId={emp.id} />
      </div>
    </div>
  );
}
