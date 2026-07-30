import { Breadcrumbs } from "@/components/Breadcrumbs";
export const metadata = { title: "DMR" };
export default function DmrLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "DMR" }]} />
      {children}
    </>
  );
}
