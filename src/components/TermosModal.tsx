"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

const TEXTO_TERMOS = `TERMO DE USO E PROTEÇÃO DE DADOS

Este sistema é de uso exclusivo da Nagalli Ambiental e de seus colaboradores devidamente autorizados.

É PROIBIDA a cópia, reprodução, distribuição, divulgação, compartilhamento ou qualquer forma de transferência deste sistema, de suas telas, dados e informações, total ou parcialmente, sem autorização prévia e expressa da Nagalli Ambiental.

Todas as informações acessadas neste sistema são confidenciais e de propriedade da Nagalli Ambiental. Direitos reservados.`;

export function TermosModal() {
  const { data: session, update } = useSession();
  const [saving, setSaving] = useState(false);

  const aceitou = Boolean((session?.user as Record<string, unknown> | undefined)?.termosAceitosEm);

  if (!session?.user || aceitou) {
    return null;
  }

  async function aceitar() {
    setSaving(true);
    try {
      const res = await fetch("/api/usuarios/aceite-termos", { method: "POST" });
      if (!res.ok) {
        throw new Error("Falha ao registrar o aceite");
      }
      await update();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
          Termo de Uso e Condições
        </h2>
        <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-line rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4 text-sm leading-relaxed text-[var(--color-ink-700)]">
          {TEXTO_TERMOS}
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-500)]">
          Para continuar utilizando o sistema, é necessário aceitar os termos de uso acima.
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            Sair
          </button>
          <button
            onClick={aceitar}
            disabled={saving}
            className="focus-ring transition-brand rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {saving ? "Registrando..." : "Aceito os Termos"}
          </button>
        </div>
      </div>
    </div>
  );
}
