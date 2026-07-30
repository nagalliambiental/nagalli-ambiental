import { Breadcrumbs } from "@/components/Breadcrumbs";
export const metadata = { title: "Configurações" };
export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Configurações" }]} />
      {children}
    </>
  );
}
