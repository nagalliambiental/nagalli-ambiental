"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function GerarBackupButton() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGerar() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup?origem=manual");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(String(err.error || "Erro ao gerar backup"), "error");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "backup-nagalli.xlsx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Backup gerado com sucesso", "success");
      router.refresh();
    } catch {
      toast("Erro ao gerar backup", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGerar}
      disabled={loading}
      className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <DatabaseBackup size={16} />}
      {loading ? "Gerando..." : "Gerar backup"}
    </button>
  );
}
