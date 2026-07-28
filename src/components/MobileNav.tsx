"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const perfil = (session?.user as Record<string, unknown>)?.perfil as string;

  const itensVisiveis = NAV_ITEMS.filter(
    (item) => !item.adminOnly || perfil === "socio"
  );

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-paper-200)] bg-[var(--color-paper-0)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Image src="/Logo1.jpeg" alt="" width={28} height={28} className="rounded" />
          <span className="font-display text-sm font-semibold text-[var(--color-ink-900)]">
            Nagalli Ambiental
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="focus-ring rounded-lg p-1.5 text-[var(--color-ink-700)]"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="border-b border-[var(--color-paper-200)] bg-[var(--color-paper-0)] px-4 pb-4 pt-2 space-y-1">
          {itensVisiveis.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`focus-ring transition-brand flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                    : "text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                }`}
              >
                <Icon size={18} strokeWidth={2} className={active ? "text-[var(--color-brand-600)]" : "text-[var(--color-ink-500)]"} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
