"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { useToast } from "@/components/Toast";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PgrccIatForm } from "@/components/PgrccIatForm";
import { PgrsForm } from "@/components/PgrsForm";
import { Upload, FileText, Loader2, X } from "lucide-react";

interface Props {
  docId: number;
  templateSlug: string;
  dadosSnapshot: Record<string, unknown>;
  empreendimentoId: number | null;
  clienteId: number;
  clienteApelido: string;
  cliente: Record<string, unknown> & { razaoSocial: string };
  configuracoes: Record<string, unknown> | null;
}

export function EditarDocumentoGeradoClient({
  docId,
  templateSlug,
  dadosSnapshot,
  clienteId,
  clienteApelido,
  cliente,
  configuracoes,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [showExtractPanel, setShowExtractPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExtract(file: File) {
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documentos-gerados/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Falha ao extrair dados", "error");
        return;
      }
      const data = await res.json();
      setExtractedText(data.texto || "Nenhum texto extraido");
      setShowExtractPanel(true);
      toast("Dados extraidos com sucesso", "success");
    } catch {
      toast("Falha ao extrair dados do documento", "error");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const isPgrcc = templateSlug === "pgrcc-iat";

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Documentos Gerados", href: "/documentos-gerados" },
          { label: `Editar — ${clienteApelido}` },
        ]}
      />

      <Topbar
        icon={FileText}
        title={`Editar ${isPgrcc ? "PGRCC IAT" : templateSlug === "pgrs-pinhais" ? "PGRS Pinhais" : "PGRS Curitiba"} — ${clienteApelido}`}
        subtitle="Edite os dados preenchidos e gere o documento atualizado"
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleExtract(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={extracting}
              className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] disabled:opacity-50"
            >
              {extracting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {extracting ? "Extraindo..." : "Importar de documento"}
            </button>
          </div>
        }
      />

      {isPgrcc ? (
        <PgrccIatForm
          clienteId={clienteId}
          clienteApelido={clienteApelido}
          cliente={cliente}
          configuracoes={configuracoes}
          initialData={dadosSnapshot}
          docId={docId}
        />
      ) : (
        <PgrsForm
          clienteId={clienteId}
          clienteApelido={clienteApelido}
          cliente={cliente}
          templateSlug={templateSlug as "pgrs-pinhais" | "pgrs-curitiba"}
          initialData={dadosSnapshot}
          docId={docId}
        />
      )}

      {showExtractPanel && extractedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--color-paper-200)] px-5 py-4">
              <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
                Texto extraido do documento
              </h3>
              <button
                onClick={() => setShowExtractPanel(false)}
                className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <p className="mb-3 text-sm text-[var(--color-ink-500)]">
                Use o texto abaixo como referencia para preencher/editar os campos do formulario.
              </p>
              <pre className="whitespace-pre-wrap rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4 font-mono text-xs text-[var(--color-ink-700)]">
                {extractedText}
              </pre>
            </div>
            <div className="border-t border-[var(--color-paper-200)] px-5 py-3 text-right">
              <button
                onClick={() => setShowExtractPanel(false)}
                className="focus-ring transition-brand rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
