import { Eye, EyeOff } from "lucide-react";

export function VisibilidadeBadge({ visibilidade }: { visibilidade: string }) {
  const privado = visibilidade === "privado";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
        privado
          ? "bg-[var(--color-paper-100)] text-[var(--color-ink-500)]"
          : "bg-[var(--color-brand-50)] text-[var(--color-brand-600)]"
      }`}
    >
      {privado ? <EyeOff size={12} /> : <Eye size={12} />}
      {privado ? "Privado" : "Público"}
    </span>
  );
}
