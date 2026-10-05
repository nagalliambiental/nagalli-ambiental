"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Download, Paperclip, Plus, Trash2 } from "lucide-react";

type Anexo = {
  id: number;
  nome: string;
  mime: string;
  tamanho: number;
  criadoEm: string;
};

function formatarTamanho(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function TarefaAnexos({ tarefaId, podeEditar = true }: { tarefaId: number; podeEditar?: boolean }) {
  const { toast } = useToast();
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    try {
      const res = await fetch(`/api/tarefas/${tarefaId}/anexos`);
      const d = await res.json().catch(() => ({ anexos: [] }));
      setAnexos(res.ok ? d.anexos ?? [] : []);
    } catch {
      setAnexos([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/tarefas/${tarefaId}/anexos`);
        const d = await res.json().catch(() => ({ anexos: [] }));
        if (!cancelado) setAnexos(res.ok ? d.anexos ?? [] : []);
      } catch {
        if (!cancelado) setAnexos([]);
      }
      if (!cancelado) setLoading(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [tarefaId]);

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setEnviando(true);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("arquivo", f);
    const res = await fetch(`/api/tarefas/${tarefaId}/anexos`, { method: "POST", body: fd });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(d.error ?? "Erro ao enviar anexo", "error");
      return;
    }
    if (d.erros?.length) toast(d.erros.join("; "), "warning");
    else toast(d.anexos?.length > 1 ? `${d.anexos.length} anexo(s) enviado(s)` : "Anexo enviado", "success");
    carregar();
  }

  async function excluir(a: Anexo) {
    if (!confirm(`Excluir o anexo "${a.nome}"?`)) return;
    const res = await fetch(`/api/tarefas/${tarefaId}/anexos/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Anexo excluído", "success");
      carregar();
    } else {
      toast("Erro ao excluir anexo", "error");
    }
  }

  return (
    <div className="space-y-2">
      {loading && <p className="text-xs text-[var(--color-ink-500)]">Carregando anexos...</p>}

      {!loading && anexos.length === 0 && (
        <p className="text-xs text-[var(--color-ink-500)]">Nenhum anexo.</p>
      )}

      <ul className="space-y-1.5">
        {anexos.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{a.nome}</p>
              <p className="text-xs text-[var(--color-ink-500)]">{formatarTamanho(a.tamanho)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={`/api/tarefas/${tarefaId}/anexos/${a.id}`}
                title="Baixar"
                className="focus-ring rounded-md p-1.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]"
              >
                <Download size={15} />
              </a>
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => excluir(a)}
                  title="Excluir anexo"
                  className="focus-ring rounded-md p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {podeEditar && (
        <label className="focus-ring transition-brand inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
          <Plus size={13} />
          {enviando ? "Enviando..." : "Anexar arquivo"}
          <input
            type="file"
            multiple
            className="hidden"
            disabled={enviando}
            onChange={(e) => {
              enviar(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

export function BotaoAnexos({ count, active, onClick }: { count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ver anexos da tarefa"
      className={`focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium ring-1 ring-[var(--color-paper-200)] hover:bg-[var(--color-paper-100)] ${
        active ? "bg-[var(--color-paper-100)] text-[var(--color-ink-900)]" : "text-[var(--color-ink-600)]"
      }`}
    >
      <Paperclip size={13} />
      Anexos{count > 0 ? ` (${count})` : ""}
    </button>
  );
}
