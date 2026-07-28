"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Upload, Loader2 } from "lucide-react";

export default function NovoDocumentoPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nome: "",
    tipo: "anexo",
    processoId: "",
    exigenciaId: "",
  });
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!file) {
        alert("Selecione um arquivo");
        return;
      }

      const uploadData = new FormData();
      uploadData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
      if (!uploadRes.ok) {
        alert("Erro ao fazer upload do arquivo");
        return;
      }
      const { path, size } = await uploadRes.json();

      await fetch("/api/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome || file.name,
          tipo: form.tipo,
          caminho: path,
          tamanho: size,
          processoId: form.processoId ? Number(form.processoId) : undefined,
          exigenciaId: form.exigenciaId ? Number(form.exigenciaId) : undefined,
        }),
      });
      router.push("/documentos");
      router.refresh();
    } catch {
      alert("Erro ao criar documento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar title="Novo Documento" subtitle="Faça upload de um novo documento" />
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Nome</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Deixe em branco para usar o nome do arquivo" className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]">
                <option value="licenca">Licença</option>
                <option value="parecer">Parecer</option>
                <option value="oficio">Ofício</option>
                <option value="laudo">Laudo</option>
                <option value="relatorio">Relatório</option>
                <option value="contrato">Contrato</option>
                <option value="anexo">Anexo</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Arquivo</label>
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-[var(--color-ink-700)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-brand-50)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-brand-600)] hover:file:bg-[var(--color-brand-100)]" required />
            </div>
            {file && <p className="mt-1 text-xs text-[var(--color-ink-500)]">Selecionado: {file.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Processo (opcional)</label>
              <input value={form.processoId} onChange={(e) => setForm({ ...form, processoId: e.target.value })} placeholder="ID do processo" className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Exigência (opcional)</label>
              <input value={form.exigenciaId} onChange={(e) => setForm({ ...form, exigenciaId: e.target.value })} placeholder="ID da exigência" className="w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Upload size={16} /> Upload</>}
            </button>
            <button type="button" onClick={() => router.back()} className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
