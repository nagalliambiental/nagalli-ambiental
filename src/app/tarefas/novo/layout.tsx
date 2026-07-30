import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata = { title: "Nova Tarefa" };

export default function NovaTarefaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Tarefas", href: "/tarefas" }, { label: "Nova" }]} />
      {children}
    </>
  );
}
