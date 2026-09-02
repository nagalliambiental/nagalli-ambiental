import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "MTR IMA/SC" };

export default function MtrImaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Breadcrumbs items={[{ label: "MTR IMA/SC", href: "/mtr-ima" }]} />
      {children}
    </div>
  );
}
