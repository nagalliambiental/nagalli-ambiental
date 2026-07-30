import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Relatórios" };

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Relatórios" }]} />
      {children}
    </>
  );
}
