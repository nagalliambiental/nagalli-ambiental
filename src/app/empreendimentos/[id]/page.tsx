export function generateStaticParams() { return []; }

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAuditoria } from "@/lib/audit";
import { ehPrivilegiado } from "@/lib/perfil";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Map, MapPin, Building2, Calendar, FileText, Edit3, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { HistoricoTab } from "@/components/HistoricoTab";
import { Tabs } from "@/components/Tabs";
import { UltimaModificacao } from "@/components/UltimaModificacao";
import { VisibilidadeToggle } from "@/components/VisibilidadeToggle";

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
    select: {
      id: true, apelido: true, descricao: true, cnpj: true, cep: true,
      municipio: true, uf: true, rua: true, numero: true, bairro: true,
      complemento: true, latitude: true, longitude: true,
      utmX: true, utmY: true, utmZona: true, utmHemisferio: true,
      criadoEm: true, visibilidade: true, clienteId: true,
      cliente: { select: { apelido: true, id: true } },
    },
  });
  if (!emp) notFound();

  const perfil = (session.user as { perfil?: string }).perfil;
  if (!ehPrivilegiado(perfil) && emp.visibilidade === "privado") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-ink-500">Acesso restrito a este empreendimento.</p>
      </div>
    );
  }

  await logAuditoria(
    "VISUALIZAR",
    "Empreendimento",
    emp.id,
    { apelido: emp.apelido },
    session.user?.id ? Number(session.user.id) : undefined
  );

  const [processos, documentos] = await Promise.all([
    prisma.processo.findMany({
      where: { empreendimentoId: emp.id },
      select: { id: true, numProtocolo: true, tipo: true, status: true, orgao: { select: { sigla: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.documento.findMany({
      where: { processo: { empreendimentoId: emp.id } },
      orderBy: { criadoEm: "desc" },
      take: 20,
      select: { id: true, nome: true, tipo: true, caminho: true, criadoEm: true },
    }),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Empreendimentos", href: "/empreendimentos" }, { label: emp.apelido }]} />

      <div className="mb-4">
        <Link href="/empreendimentos" className="focus-ring transition-brand inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]">
          <ArrowLeft size={16} />
          Voltar para empreendimentos
        </Link>
      </div>

      <Topbar
        icon={Building2}
        title={emp.apelido}
        subtitle="Detalhes do empreendimento"
        actions={
          <div className="flex items-center gap-2">
            {ehPrivilegiado(perfil) && (
              <VisibilidadeToggle endpoint={`/api/empreendimentos/${emp.id}`} visibilidade={emp.visibilidade} />
            )}
            <Link
              href={`/empreendimentos/${emp.id}/editar`}
              className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
            >
              <Edit3 size={14} />
              Editar
            </Link>
            <DeleteButton entity="Empreendimento" endpoint={`/api/empreendimentos/${emp.id}`} redirectTo="/empreendimentos" />
          </div>
        }
      />

      <UltimaModificacao entidade="empreendimento" entidadeId={emp.id} />

      <Tabs
        tabs={[
          {
            key: "informacoes",
            label: "Informações",
            content: (
              <div className="space-y-6">
                <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                  <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">Informações</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-[var(--color-ink-500)]">
                      <Building2 size={16} />
                      <Link href={`/clientes/${emp.cliente.id}`} className="text-[var(--color-ink-900)] hover:text-[var(--color-brand-600)]">{emp.cliente.apelido}</Link>
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

                {(emp.latitude != null && emp.longitude != null) || (emp.utmX != null && emp.utmY != null) ? (
                  <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Map size={18} className="text-[var(--color-ink-500)]" />
                      <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Coordenadas</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {emp.latitude != null && emp.longitude != null && (
                        <>
                          <div className="text-[var(--color-ink-500)]">Latitude: <span className="text-[var(--color-ink-700)]">{emp.latitude}</span></div>
                          <div className="text-[var(--color-ink-500)]">Longitude: <span className="text-[var(--color-ink-700)]">{emp.longitude}</span></div>
                        </>
                      )}
                      {emp.utmX != null && emp.utmY != null && (
                        <>
                          <div className="text-[var(--color-ink-500)]">UTM X (Easting): <span className="text-[var(--color-ink-700)]">{emp.utmX}</span></div>
                          <div className="text-[var(--color-ink-500)]">UTM Y (Northing): <span className="text-[var(--color-ink-700)]">{emp.utmY}</span></div>
                          {emp.utmZona != null && <div className="text-[var(--color-ink-500)]">UTM Zona: <span className="text-[var(--color-ink-700)]">{emp.utmZona}{emp.utmHemisferio || ""}</span></div>}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "processos",
            label: "Processos",
            count: processos.length,
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
                {processos.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-[var(--color-ink-500)]">
                    <FileText size={24} />
                    <p className="text-sm">Nenhum processo vinculado</p>
                    <Link href={`/processos/novo`} className="text-sm text-[var(--color-brand-600)] hover:underline">
                      Cadastrar processo
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-paper-200)] text-[var(--color-ink-500)]">
                          <th className="text-left p-4 font-medium">Protocolo</th>
                          <th className="text-left p-4 font-medium">Tipo</th>
                          <th className="text-left p-4 font-medium">Órgão</th>
                          <th className="text-left p-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processos.map((p) => (
                          <tr key={p.id} className="border-t border-[var(--color-paper-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
                            <td className="p-4">
                              <Link href={`/processos/${p.id}`} className="font-mono text-[var(--color-brand-600)] hover:underline">{p.numProtocolo}</Link>
                            </td>
                            <td className="p-4">{p.tipo}</td>
                            <td className="p-4">{p.orgao.sigla}</td>
                            <td className="p-4">{p.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "documentos",
            label: "Documentos",
            count: documentos.length,
            content: (
              <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Documentos</h2>
                {documentos.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-500)]">Nenhum documento vinculado aos processos deste empreendimento.</p>
                ) : (
                  <div className="space-y-2">
                    {documentos.map((d) => (
                      <div key={d.id} className="flex items-center justify-between border-b border-[var(--color-paper-200)] pb-2 text-sm">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-[var(--color-ink-400)]" />
                          <span className="text-[var(--color-ink-700)]">{d.nome}</span>
                          <span className="text-xs text-[var(--color-ink-400)]">{d.tipo}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[var(--color-ink-500)]">{format(new Date(d.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</span>
                          <a href={`/api/documentos/${d.id}/download`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] hover:underline">
                            <Download size={14} />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "historico",
            label: "Histórico",
            content: <HistoricoTab empreendimentoId={emp.id} />,
          },
        ]}
      />
    </div>
  );
}
