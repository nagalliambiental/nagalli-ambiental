"use client";

import { SinoNotificacoes } from "@/components/SinoNotificacoes";

export function AppTopBar() {
  return (
    <header className="sticky top-0 z-20 hidden items-center justify-end border-b border-[var(--color-paper-200)] bg-[var(--color-paper-0)] px-5 py-2.5 sm:px-8 lg:flex">
      <SinoNotificacoes />
    </header>
  );
}
