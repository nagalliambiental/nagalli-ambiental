import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Nova Licença" };

export default function NovoProcessoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Licenças", href: "/processos" }, { label: "Nova" }]} />
      {children}
    </>
  );
}
