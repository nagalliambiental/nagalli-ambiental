import dynamic from "next/dynamic";

const ClientPage = dynamic(() => import("./detail"), { ssr: false });

export function generateStaticParams() { return []; }

export default function Page() {
  return <ClientPage />;
}
