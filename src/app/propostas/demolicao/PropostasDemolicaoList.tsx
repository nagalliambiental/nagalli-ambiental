"use client";

import Link from "next/link";
import { formatarMoeda } from "@/lib/templates/proposta-demolicao/config";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface Proposta {
  id: number;
  numero: number;
  ano: number;
  revisao: number;
  engenheiroNome: string;
  empresaNome: string;
  bairro: string;
  cidade: string;
  uf: string;
  quantidadePgrcc: number;
  quantidadeRgrcc: number;
  totalFinal: number | null;
  criadoEm: string;
}

interface Props {
  propostas: Proposta[];
}

export default function PropostasDemolicaoList({ propostas }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const handleGerar = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/propostas-demolicao/${id}/gerar`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao gerar documento");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `Proposta_Demolicao_${id}.docx`;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast("Documento gerado!", "success");
    } catch {
      toast("Erro ao gerar documento", "error");
    }
  };

  const handleExcluir = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Tem certeza que deseja excluir esta proposta?")) return;

    try {
      const res = await fetch(`/api/propostas-demolicao/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");

      toast("Proposta excluída", "success");
      router.refresh();
    } catch {
      toast("Erro ao excluir proposta", "error");
    }
  };

  if (propostas.length === 0) {
    return (
      <div className="text-center py-12 text-ink-500">
        <p>Nenhuma proposta de demolição encontrada.</p>
        <Link href="/propostas/demolicao/nova" className="text-brand-600 hover:underline mt-4 inline-block">
          Criar primeira proposta
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-paper-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left font-medium text-ink-700">Identificação</th>
            <th className="p-3 text-left font-medium text-ink-700">Engenheiro</th>
            <th className="p-3 text-left font-medium text-ink-700">Empresa</th>
            <th className="p-3 text-left font-medium text-ink-700">Local</th>
            <th className="p-3 text-left font-medium text-ink-700">Itens</th>
            <th className="p-3 text-right font-medium text-ink-700">Valor Final</th>
            <th className="p-3 text-left font-medium text-ink-700">Data</th>
            <th className="p-3 text-center font-medium text-ink-700">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-paper-200">
          {propostas.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50 cursor-pointer">
              <td className="p-3 font-mono text-brand-700">
                {p.numero} / {p.ano} – REV. {String(p.revisao).padStart(2, "0")}
              </td>
              <td className="p-3 text-ink-900">{p.engenheiroNome}</td>
              <td className="p-3 text-ink-900">{p.empresaNome}</td>
              <td className="p-3 text-ink-900">
                {p.bairro}, {p.cidade}/{p.uf}
              </td>
              <td className="p-3 text-ink-900">
                PGRCC: {p.quantidadePgrcc} | RGRCC: {p.quantidadeRgrcc}
              </td>
              <td className="p-3 text-right font-medium text-brand-700">
                {p.totalFinal ? formatarMoeda(p.totalFinal) : "—"}
              </td>
              <td className="p-3 text-ink-500">
                {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
              </td>
              <td className="p-3 text-center space-x-2">
                <button
                  onClick={(e) => handleGerar(p.id, e)}
                  className="px-3 py-1 text-xs bg-brand-100 text-brand-700 rounded hover:bg-brand-200 transition"
                >
                  Gerar DOCX
                </button>
                <Link
                  href={`/propostas/demolicao/${p.id}/editar`}
                  className="px-3 py-1 text-xs border border-ink-300 text-ink-700 rounded hover:bg-gray-50 transition"
                >
                  Editar
                </Link>
                <button
                  onClick={(e) => handleExcluir(p.id, e)}
                  className="px-3 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50 transition"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}