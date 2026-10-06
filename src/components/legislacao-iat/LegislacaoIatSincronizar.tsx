"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/Toast";

export function LegislacaoIatSincronizar() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sincronizar() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ferramentas/legislacao-iat/sincronizar", { method: "POST" });
      const d = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (res.ok) {
        const m = `${d.novas} nova(s), ${d.atualizadas} atualizada(s) e ${d.revogadas} revogada(s) — ${d.lidas} norma(s) verificada(s) no site do IAT.`;
        setMessage(m);
        toast(m, "success");
      } else {
        const erro = (d.error as string) ?? "Falha ao sincronizar.";
        setMessage(erro);
        toast(erro, "error");
      }
    } catch {
      const erro = "Falha ao sincronizar.";
      setMessage(erro);
      toast(erro, "error");
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={sincronizar}
        disabled={loading}
        className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Sincronizando..." : "Sincronizar agora"}
      </button>
      {message && <span className="max-w-md text-xs text-[var(--color-ink-500)]">{message}</span>}
    </div>
  );
}
