import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Novo Processo" };

export default function NovoProcessoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Processos", href: "/processos" }, { label: "Novo" }]} />
      {children}
    </>
  );
}
