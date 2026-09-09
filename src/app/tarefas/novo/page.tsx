import { Topbar } from "@/components/Topbar";
import { ClipboardCheck } from "lucide-react";
import TarefaForm from "@/components/TarefaForm";

export default function NovaTarefaPage() {
  return (
    <div>
      <Topbar icon={ClipboardCheck} title="Nova Tarefa" subtitle="Crie uma nova tarefa" />
      <div className="mx-auto max-w-2xl">
        <TarefaForm modo="novo" endpoint="/api/tarefas" redirectTo="/tarefas" />
      </div>
    </div>
  );
}