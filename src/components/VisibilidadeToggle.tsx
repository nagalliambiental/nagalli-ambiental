"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export function VisibilidadeToggle({
  endpoint,
  visibilidade: inicial,
}: {
  endpoint: string;
  visibilidade: string;
}) {
  const { toast } = useToast();
  const [visibilidade, setVisibilidade] = useState(inicial);
  const [saving, setSaving] = useState(false);
  const privado = visibilidade === "privado";

  async function toggle() {
    if (saving) return;
    const novo = privado ? "publico" : "privado";
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibilidade: novo }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.erro || err.error || "Erro ao alterar visibilidade", "error");
        return;
      }
      setVisibilidade(novo);
      toast(
        novo === "publico" ? "Visibilidade definida como Público" : "Visibilidade definida como Privado",
        "success"
      );
    } catch {
      toast("Erro ao alterar visibilidade", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={
        privado
          ? "Visibilidade privada — clique para tornar público"
          : "Visibilidade pública — clique para tornar privado"
      }
      className={`focus-ring transition-brand flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${
        privado
          ? "border-[var(--color-paper-200)] bg-white text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          : "border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-100)]"
      }`}
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : privado ? <EyeOff size={14} /> : <Eye size={14} />}
      {privado ? "Privado" : "Público"}
    </button>
  );
}
