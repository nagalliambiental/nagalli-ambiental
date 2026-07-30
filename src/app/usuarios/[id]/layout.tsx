import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function UsuarioDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Usuários", href: "/usuarios" }, { label: "Usuário" }]} />
      {children}
    </>
  );
}
