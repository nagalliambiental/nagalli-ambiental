import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-[var(--color-ink-500)] mb-4">
      <Link href="/" className="hover:text-[var(--color-brand-600)] transition-colors">
        <Home size={14} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={12} />
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--color-brand-600)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--color-ink-900)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
