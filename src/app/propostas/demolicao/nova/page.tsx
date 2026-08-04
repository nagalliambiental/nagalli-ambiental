import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PropostaDemolicaoForm from "./PropostaDemolicaoForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova Proposta Demolição" };

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Propostas", href: "/propostas" },
          { label: "Nova", href: "/propostas/nova" },
          { label: "PGRCC e RGRCC (Demolição)" },
        ]}
      />
      <PropostaDemolicaoForm />
    </div>
  );
}