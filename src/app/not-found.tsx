import Link from "next/link";
import { SearchX, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <SearchX size={32} className="text-amber-600" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">Página não encontrada</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">A página que você procura não existe ou foi removida.</p>
      </div>
      <Link
        href="/"
        className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
      >
        <Home size={14} />
        Ir para o início
      </Link>
    </div>
  );
}
