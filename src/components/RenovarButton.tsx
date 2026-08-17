"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface RenovarButtonProps {
  processoId: number;
  numProtocolo: string;
}

export default function RenovarButton({ processoId, numProtocolo }: RenovarButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleRenovar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/processos/${processoId}/renovar`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Erro ao iniciar renovação", "error");
        setLoading(false);
        return;
      }
      const data = await res.json();
      toast("Renovação iniciada — novo processo criado", "success");
      router.push(`/processos/${data.id}`);
      router.refresh();
    } catch {
      toast("Erro ao iniciar renovação", "error");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRenovar}
      disabled={loading}
      className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      <RefreshCw size={14} />
      {loading ? "Criando..." : `Iniciar renovação${numProtocolo ? ` de ${numProtocolo}` : ""}`}
    </button>
  );
}