import { Loader2 } from "lucide-react";

export default function LoadingPage() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex items-center gap-3 text-[var(--color-ink-500)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    </div>
  );
}
