"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle size={32} className="text-red-600" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-[var(--color-ink-900)]">Algo deu errado</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-500)]">Ocorreu um erro inesperado. Tente novamente.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
        <Link
          href="/"
          className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        >
          <Home size={14} />
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
