import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Mail, Phone, User, FileText, MapPin, Map, Globe, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import EntityActions from "@/components/EntityActions";
import { TEMPLATES } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(id) },
    include: {
      _count: { select: { empreendimentos: true, financeiros: true } },
      documentosGerados: { orderBy: { createdAt: "desc" }, take: 10 },
    },
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

          {(cliente.rua || cliente.cep || cliente.municipio || cliente.uf) && (
            <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-[var(--color-ink-500)]" />
                <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Endereço</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {cliente.rua && <div className="col-span-2 text-[var(--color-ink-700)]">
                  {cliente.rua}{cliente.numero ? `, ${cliente.numero}` : ""}
                </div>}
                {cliente.bairro && <div className="text-[var(--color-ink-500)]">Bairro: {cliente.bairro}</div>}
                {cliente.complemento && <div className="text-[var(--color-ink-500)]">Complemento: {cliente.complemento}</div>}
                {cliente.cep && <div className="text-[var(--color-ink-500)]">CEP: {cliente.cep}</div>}
                {cliente.municipio && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Map size={14} />{cliente.municipio}</div>}
                {cliente.uf && <div className="flex items-center gap-1 text-[var(--color-ink-500)]"><Globe size={14} />{cliente.uf}</div>}
              </div>
            </div>
          )}

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">
              <FileSpreadsheet size={18} className="inline mr-2 text-[var(--color-ink-500)]" />
              Gerar PGRS
            </h2>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <Link
                  key={t.slug}
                  href={`/clientes/${id}/gerar/${t.slug}`}
                  className="focus-ring transition-brand flex items-center justify-between border border-[var(--color-paper-200)] rounded-[var(--radius-card)] px-4 py-3 hover:bg-[var(--color-paper-100)]"
                >
                  <div>
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-xs text-[var(--color-ink-500)]">{t.descricao}</p>
                  </div>
                  <span className="text-sm text-[var(--color-ink-300)]">Gerar →</span>
                </Link>
              ))}
            </div>
          </div>

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

          <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
            <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3">Documentos gerados</h2>
            {cliente.documentosGerados.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-500)]">Nenhum documento gerado ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {cliente.documentosGerados.map((d) => (
                  <li key={d.id} className="flex items-center justify-between border-b border-[var(--color-paper-200)] pb-2 last:border-0">
                    <span className="text-[var(--color-ink-700)]">
                      {d.templateSlug === "pgrs-pinhais" ? "PGRS Pinhais" : d.templateSlug === "pgrs-curitiba" ? "PGRS Curitiba" : d.templateSlug}
                    </span>
                    <span className="text-xs text-[var(--color-ink-500)]">
                      {format(d.createdAt, "dd/MM/yyyy")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3">
            <Link href="/clientes" className="focus-ring transition-brand flex-1 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-center text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Voltar
            </Link>
          </div>

          <EntityActions
            entity="cliente"
            entityName="Cliente"
            endpoint={`/api/clientes/${cliente.id}`}
            redirectTo="/clientes"
            fields={[
              { name: "apelido", label: "Apelido", type: "text", required: true },
              { name: "razaoSocial", label: "Razão Social", type: "text", required: true },
              { name: "nomeFantasia", label: "Nome Fantasia", type: "text" },
              { name: "cnpj", label: "CNPJ", type: "text", required: true },
              { name: "telefone", label: "Telefone", type: "text", required: true },
              { name: "email", label: "Email", type: "text", required: true },
              { name: "rua", label: "Rua", type: "text" },
              { name: "numero", label: "Número", type: "text" },
              { name: "bairro", label: "Bairro", type: "text" },
              { name: "complemento", label: "Complemento", type: "text" },
              { name: "cep", label: "CEP", type: "text" },
              { name: "municipio", label: "Município", type: "text" },
              { name: "uf", label: "UF", type: "text" },
              { name: "respLegal", label: "Resp. Legal", type: "text", required: true },
              { name: "dirigenteNome", label: "Dirigente", type: "text" },
              { name: "dirigenteCargo", label: "Cargo do dirigente", type: "text" },
              { name: "responsavelPgrsNome", label: "Resp. implantação PGRS", type: "text" },
              { name: "responsavelPgrsCargo", label: "Cargo resp. PGRS", type: "text" },
              { name: "ramoAtividade", label: "Ramo de atividade", type: "text" },
            ]}
            data={{
              apelido: cliente.apelido,
              razaoSocial: cliente.razaoSocial,
              nomeFantasia: cliente.nomeFantasia,
              cnpj: cliente.cnpj,
              telefone: cliente.telefone,
              email: cliente.email,
              rua: cliente.rua,
              numero: cliente.numero,
              bairro: cliente.bairro,
              complemento: cliente.complemento,
              cep: cliente.cep,
              municipio: cliente.municipio,
              uf: cliente.uf,
              respLegal: cliente.respLegal,
              dirigenteNome: cliente.dirigenteNome || "",
              dirigenteCargo: cliente.dirigenteCargo || "",
              responsavelPgrsNome: cliente.responsavelPgrsNome || "",
              responsavelPgrsCargo: cliente.responsavelPgrsCargo || "",
              ramoAtividade: cliente.ramoAtividade || "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
