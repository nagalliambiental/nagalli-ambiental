"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { useSession } from "next-auth/react";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const semChrome = pathname === "/login";

  if (semChrome || !session) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <MobileNav />
      <div className="lg:pl-[var(--sidebar-width)]">
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </>
  );
}
