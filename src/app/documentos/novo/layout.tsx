import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Novo Documento" };

export default function NovoDocumentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Documentos", href: "/documentos" }, { label: "Novo" }]} />
      {children}
    </>
  );
}
