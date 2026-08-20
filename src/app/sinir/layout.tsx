import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = { title: "SINIR MTR" };

export default function SinirLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Breadcrumbs items={[{ label: "SINIR MTR", href: "/sinir" }]} />
      {children}
    </div>
  );
}