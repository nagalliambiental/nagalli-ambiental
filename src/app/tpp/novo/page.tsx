import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Truck } from "lucide-react";
import TppForm from "@/components/TppForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova TPP" };

export default async function NovaTppPage(props: { searchParams: Promise<{ renovar?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { renovar } = await props.searchParams;
  const renovarId = renovar && /^\d+$/.test(renovar) ? Number(renovar) : undefined;

  return (
    <div>
      <Breadcrumbs items={[{ label: "TPP", href: "/tpp" }, { label: "Nova TPP" }]} />
      <Topbar
        icon={Truck}
        title={renovarId ? "Renovar TPP" : "Nova TPP"}
        subtitle="Cadastre a autorização de transporte de produtos perigosos e acompanhe o vencimento"
      />
      <TppForm modo="novo" renovarId={renovarId} />
    </div>
  );
}