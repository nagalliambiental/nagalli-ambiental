"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, type NavChild } from "@/lib/nav-items";
import { useSession } from "next-auth/react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Cadastros"]));
  const perfil = (session?.user as Record<string, unknown>)?.perfil as string;

  const ehPrivilegiado = perfil === "socio" || perfil === "admin";

  const filtraFilhos = (children: NavChild[] = []) =>
    children.filter((c) => !c.adminOnly || ehPrivilegiado);

  const itensVisiveis = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !ehPrivilegiado) return false;
    if (item.children) return filtraFilhos(item.children).length > 0;
    return true;
  });

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname?.startsWith(href);
  }

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-paper-200)] bg-[var(--color-paper-0)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Image src="/Logo.jpeg" alt="" width={28} height={28} className="rounded" />
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
          {itensVisiveis.map(({ label, href, icon: Icon, children }) => {
            if (children) {
              const filhos = filtraFilhos(children);
              const expanded = expandedGroups.has(label);
              const groupActive = filhos.some((c) => isActive(c.href));
              return (
                <div key={label}>
                  <button
                    onClick={() => toggleGroup(label)}
                    className={`focus-ring transition-brand flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      groupActive
                        ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                        : "text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} className={groupActive ? "text-[var(--color-brand-600)]" : "text-[var(--color-ink-500)]"} />
                    {label}
                    <ChevronDown size={14} className={`ml-auto transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
                  </button>
                  {expanded && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-[var(--color-paper-200)] pl-3">
                      {filhos.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={`focus-ring transition-brand flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                            isActive(child.href)
                              ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                              : "text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href!}
                onClick={() => setOpen(false)}
                className={`focus-ring transition-brand flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(href!)
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                    : "text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                }`}
              >
                <Icon size={18} strokeWidth={2} className={isActive(href!) ? "text-[var(--color-brand-600)]" : "text-[var(--color-ink-500)]"} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
