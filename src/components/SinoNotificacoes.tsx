"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";

type Notificacao = {
  id: number;
  tipo: string;
  mensagem: string;
  canal: string;
  lida: boolean;
  dataEnvio: string;
  dataEvento: string | null;
  tarefaId: number | null;
  url: string | null;
};

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function notificacaoLink(n: Notificacao): string | null {
  if (n.url) return n.url;
  if (n.tarefaId) return `/tarefas/${n.tarefaId}`;
  if (n.tipo === "legislacao_iat") return "/legislacao-iat";
  return null;
}

export function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    async function buscar() {
      try {
        const res = await fetch("/api/notificacoes");
        if (!res.ok) return;
        const dados: Notificacao[] = await res.json();
        if (ativo) setNotificacoes(dados);
      } catch {
        // falha de rede: mantém a lista atual
      }
    }
    void buscar();
    const interval = setInterval(() => void buscar(), 60_000);
    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function marcarLidas() {
    const res = await fetch("/api/notificacoes/marcar-lidas", { method: "POST" });
    if (res.ok) setNotificacoes([]);
  }

  const count = notificacoes.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notificações"
        aria-label="Notificações"
        className="focus-ring transition-brand relative rounded-lg p-2 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-[var(--color-paper-200)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">Notificações</span>
            {count > 0 && (
              <button
                type="button"
                onClick={marcarLidas}
                className="text-xs font-medium text-[var(--color-brand-600)] hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-ink-500)]">
                Nenhuma notificação não lida.
              </div>
            ) : (
              notificacoes.map((n) => {
                const href = notificacaoLink(n);
                const externo = !!href && !href.startsWith("/");
                const conteudo = (
                  <div className="border-b border-[var(--color-paper-100)] px-4 py-3 last:border-0 hover:bg-[var(--color-paper-50)]">
                    <p className="text-sm text-[var(--color-ink-700)]">{n.mensagem}</p>
                    <p className="mt-1 text-xs text-[var(--color-ink-400)]">
                      {formatarData(n.dataEvento ?? n.dataEnvio)}
                    </p>
                  </div>
                );
                return href ? (
                  <a
                    key={n.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    {...(externo ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {conteudo}
                  </a>
                ) : (
                  <div key={n.id}>{conteudo}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
