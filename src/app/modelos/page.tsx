import Link from "next/link";
import { FileStack, ArrowUpRight } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { TEMPLATES } from "@/lib/templates";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GridComBusca, type ItemBusca } from "@/components/BuscaLocal";

export const metadata = { title: "Modelos de Documento" };

export default function ModelosPage() {
  const itens: ItemBusca[] = TEMPLATES.map((modelo) => ({
    id: modelo.slug,
    texto: [modelo.nome, modelo.descricao].filter(Boolean).join(" "),
    conteudo: (
      <div
        key={modelo.slug}
        className="shadow-card flex flex-col rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="rounded-lg bg-[var(--color-brand-50)] p-2.5">
            <FileStack size={20} className="text-[var(--color-brand-600)]" strokeWidth={2} />
          </div>
          <span className="rounded-full bg-[var(--color-brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-700)]">
            Disponível
          </span>
        </div>
        <p className="font-display text-base font-semibold text-[var(--color-ink-900)]">
          {modelo.nome}
        </p>
        <p className="mt-3 flex-1 text-sm text-[var(--color-ink-700)]">
          {modelo.descricao}
        </p>
        <Link
          href="/clientes"
          className="focus-ring transition-brand mt-4 flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
        >
          Gerar para uma empresa
          <ArrowUpRight size={15} />
        </Link>
      </div>
    ),
  }));

  const rodape = (
    <div className="flex flex-col items-start justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-paper-200)] p-5 text-[var(--color-ink-500)]">
      <FileStack size={20} className="mb-2 text-[var(--color-ink-300)]" strokeWidth={2} />
      <p className="text-sm font-medium text-[var(--color-ink-700)]">Novos modelos em breve</p>
      <p className="mt-1 text-sm">
        Outros documentos oficiais serão adicionados aqui conforme forem cadastrados.
      </p>
    </div>
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Modelos" }]} />
      <Topbar
        icon={FileStack}
        title="Modelos de documento"
        subtitle="Modelos oficiais disponíveis para geração"
      />

      <GridComBusca
        itens={itens}
        rodape={rodape}
        rotulo="modelo(s)"
        placeholder="Buscar por nome ou descrição..."
      />
    </div>
  );
}
