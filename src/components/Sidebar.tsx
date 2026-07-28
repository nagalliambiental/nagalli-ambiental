"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";
import { UserMenu } from "@/components/UserMenu";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perfil = (session?.user as Record<string, unknown>)?.perfil as string;

  const itensVisiveis = NAV_ITEMS.filter(
    (item) => !item.adminOnly || perfil === "socio"
  );

  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-[var(--color-paper-200)] bg-[var(--color-paper-0)]"
      style={{ width: "var(--sidebar-width)" }}
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <Image src="/Logo.jpeg" alt="" width={36} height={36} className="shrink-0 rounded" />
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold text-[var(--color-ink-900)]">
            Nagalli Ambiental
          </p>
          <p className="text-xs text-[var(--color-ink-500)]">Sistema de Gestão</p>
        </div>
      </div>
      <div className="river-divider" />

      <div className="px-4 pt-5">
        <Link
          href="/clientes/novo"
          className="focus-ring transition-brand flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Novo cliente
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {itensVisiveis.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`focus-ring transition-brand group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                active
                  ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                  : "text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-[var(--color-brand-500)]" />
              )}
              <Icon
                size={18}
                strokeWidth={2}
                className={active ? "text-[var(--color-brand-600)]" : "text-[var(--color-ink-500)]"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-paper-200)] px-6 py-4">
        <UserMenu />
      </div>
    </aside>
  );
}
