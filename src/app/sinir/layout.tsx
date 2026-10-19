import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "MTR/SINIR" };

export default function SinirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Breadcrumbs items={[{ label: "MTR/SINIR", href: "/sinir" }]} />
      {children}
    </div>
  );
}
