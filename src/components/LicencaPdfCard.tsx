"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/Toast";

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const digits = value >= 100 || i === 0 ? 0 : 1;
  return `${value.toFixed(digits).replace(".", ",")} ${units[i]}`;
}

interface LicencaPdf {
  id: number;
  nome: string;
  tamanho: number;
  criadoEm: string | Date;
}

export default function LicencaPdfCard({
  processoId,
  documento,
}: {
  processoId: number;
  documento: LicencaPdf | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File | null) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      toast("Somente arquivos PDF", "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", "licenca");
      formData.append("processoId", String(processoId));
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      toast("Licença armazenada com sucesso", "success");
      router.refresh();
    } catch {
      toast("Erro ao fazer upload", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!documento) return;
    if (!window.confirm("Excluir a licença armazenada?")) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/documentos/${documento.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      toast("Licença excluída", "success");
      router.refresh();
    } catch {
      toast("Erro ao excluir", "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
      <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-3 flex items-center gap-2">
        <FileText size={16} />
        Licença (PDF)
      </h2>
      {documento ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--color-ink-900)]" title={documento.nome}>
              {documento.nome}
            </p>
            <p className="text-xs text-[var(--color-ink-500)]">
              {formatSize(documento.tamanho)} · {format(new Date(documento.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <a
            href={`/api/documentos/${documento.id}/download`}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-river-200)] bg-[var(--color-river-50)] px-3 py-2 text-sm font-medium text-[var(--color-river-700)] hover:bg-[var(--color-river-100)]"
          >
            <Download size={14} />
            Baixar
          </a>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
          >
            {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-[var(--color-ink-500)]">
            Nenhuma licença armazenada. Faça o upload do PDF da licença para guardá-la junto ao processo.
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Enviando..." : "Fazer upload do PDF"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}