"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function ExcluirBackupButton({ id }: { id: number }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleExcluir() {
    if (!confirm("Tem certeza que deseja excluir este backup?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/backups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(String(err.error || "Erro ao excluir backup"), "error");
        return;
      }
      toast("Backup excluído com sucesso", "success");
      router.refresh();
    } catch {
      toast("Erro ao excluir backup", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExcluir}
      disabled={loading}
      title="Excluir backup"
      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      Excluir
    </button>
  );
}
