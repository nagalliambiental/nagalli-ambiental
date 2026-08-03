import { getUltimaModificacao } from "@/lib/lastModification";
import { formatDateTime } from "@/lib/format";
import { History } from "lucide-react";

export async function UltimaModificacao({
  entidade,
  entidadeId,
}: {
  entidade: string;
  entidadeId: number;
}) {
  const log = await getUltimaModificacao(entidade, entidadeId);
  if (!log) return null;

  const ehCriacao = /criar|CRIAR/.test(log.acao);
  return (
    <div className="mb-4 flex items-center gap-2 text-xs text-[var(--color-ink-500)]">
      <History size={14} className="shrink-0" />
      <span>
        {ehCriacao ? "Criado" : "Última modificação"} por{" "}
        <span className="font-medium text-[var(--color-ink-700)]">
          {log.usuario?.nome ?? "usuário desconhecido"}
        </span>{" "}
        em {formatDateTime(log.criadoEm)}
      </span>
    </div>
  );
}
