import { Breadcrumbs } from "@/components/Breadcrumbs";
export const metadata = { title: "Novo Usuário" };
export default function NovoUsuarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Usuários", href: "/usuarios" }, { label: "Novo" }]} />
      {children}
    </>
  );
}
