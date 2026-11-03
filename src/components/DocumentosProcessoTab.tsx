"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { useToast } from "@/components/Toast";

type Documento = {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  criadoEm: string;
};

const TIPOS = [
  ["licenca", "Licença"],
  ["parecer", "Parecer"],
  ["oficio", "Ofício"],
  ["laudo", "Laudo"],
  ["contrato", "Contrato"],
  ["anexo", "Anexo"],
  ["outro", "Outro"],
] as const;

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosProcessoTab({ processoId }: { processoId: number }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [tipo, setTipo] = useState("anexo");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/documentos?processoId=${processoId}`);
      if (res.ok) setDocumentos(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    fetch(`/api/documentos?processoId=${processoId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (ativo) setDocumentos(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [processoId]);

  async function enviar(file: File) {
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("processoId", String(processoId));
      form.append("tipo", tipo);
      form.append("nome", file.name);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast(data?.error || "Falha ao anexar documento", "error");
        return;
      }
      toast("Documento anexado à licença", "success");
      await carregar();
    } catch {
      toast("Falha ao anexar documento", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-500)]">Tipo do documento</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm">
              {TIPOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {enviando ? "Enviando..." : "Anexar documento"}
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void enviar(f); }} />
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-[var(--color-ink-900)]">
          <Paperclip size={16} /> Documentos da licença ({documentos.length})
        </h2>
        {carregando ? <div className="py-6 text-center text-sm text-[var(--color-ink-500)]">Carregando documentos...</div> : documentos.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--color-ink-500)]">Nenhum documento anexado.</p>
        ) : (
          <div className="divide-y divide-[var(--color-paper-100)]">
            {documentos.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText size={17} className="shrink-0 text-[var(--color-brand-500)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-ink-800)]">{doc.nome}</p>
                    <p className="text-xs text-[var(--color-ink-500)]">{doc.tipo} · {tamanho(doc.tamanho)}</p>
                  </div>
                </div>
                <a href={`/api/documentos/${doc.id}/download`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]" title="Baixar documento">
                  <Download size={16} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
