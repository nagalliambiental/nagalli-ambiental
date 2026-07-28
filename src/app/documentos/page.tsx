import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const dynamic = "force-dynamic";

const tipoColors: Record<string, string> = {
  licenca: "bg-green-100 text-green-800",
  parecer: "bg-blue-100 text-blue-800",
  oficio: "bg-purple-100 text-purple-800",
  laudo: "bg-yellow-100 text-yellow-800",
  relatorio: "bg-orange-100 text-orange-800",
  contrato: "bg-indigo-100 text-indigo-800",
  anexo: "bg-gray-100 text-gray-800",
  outro: "bg-gray-100 text-gray-800",
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default async function DocumentosPage() {
  const documentos = await prisma.documento.findMany({
    include: {
      processo: { select: { numProtocolo: true } },
      exigencia: { select: { id: true, descricao: true } },
    },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <Link
          href="/documentos/novo"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
        >
          + Novo Documento
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left p-4 font-medium">Nome</th>
              <th className="text-left p-4 font-medium">Tipo</th>
              <th className="text-left p-4 font-medium">Processo</th>
              <th className="text-left p-4 font-medium">Tamanho</th>
              <th className="text-left p-4 font-medium">Data</th>
              <th className="text-left p-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-medium max-w-xs truncate">{d.nome}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${tipoColors[d.tipo] || "bg-gray-100 text-gray-800"}`}>
                    {d.tipo.charAt(0).toUpperCase() + d.tipo.slice(1)}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm text-gray-600">
                  {d.processo?.numProtocolo || "—"}
                </td>
                <td className="p-4 text-gray-600">{formatBytes(d.tamanho)}</td>
                <td className="p-4 text-gray-600">
                  {format(d.criadoEm, "dd/MM/yyyy", { locale: ptBR })}
                </td>
                <td className="p-4">
                  <a
                    href={d.caminho}
                    download
                    className="text-emerald-700 hover:text-emerald-800 text-sm"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documentos.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum documento cadastrado</p>
        )}
      </div>
    </div>
  );
}
