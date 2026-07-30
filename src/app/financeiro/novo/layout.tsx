import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Nova Cobrança" };

export default function NovaCobrancaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Financeiro", href: "/financeiro" }, { label: "Nova" }]} />
      {children}
    </>
  );
}
