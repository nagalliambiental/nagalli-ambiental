import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Nova Exigência" };

export default function NovaExigenciaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Exigências", href: "/exigencias" }, { label: "Nova" }]} />
      {children}
    </>
  );
}
