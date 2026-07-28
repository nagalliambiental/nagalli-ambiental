"use client";

import { signOut, useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
          {session?.user?.name || "Usuário"}
        </p>
        <p className="truncate text-xs text-[var(--color-ink-500)]">
          {session?.user?.email}
        </p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="focus-ring transition-brand ml-3 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-ink-700)]"
      >
        Sair
      </button>
    </div>
  );
}
