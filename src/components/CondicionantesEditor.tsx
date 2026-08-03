"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Loader2, Eye, Download, FileCheck2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface CondicionanteItem {
  texto: string;
  atendida: boolean;
}

export function CondicionantesEditor({
  processoId,
  initialItens,
}: {
  processoId: number;
  initialItens: CondicionanteItem[];
}) {
  const { toast } = useToast();
  const [itens, setItens] = useState<CondicionanteItem[]>(initialItens.length ? initialItens : []);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function addItem() {
    setItens((prev) => [...prev, { texto: "", atendida: false }]);
  }

  function updateTexto(index: number, texto: string) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, texto } : item)));
  }

  function updateAtendida(index: number, atendida: boolean) {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, atendida } : item)));
  }

  function removeItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function salvar() {
    setSaving(true);
    try {
      const res = await fetch(`/api/processos/${processoId}/condicionantes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens }),
      });
      if (!res.ok) throw new Error();
      const salvos: CondicionanteItem[] = await res.json();
      setItens(salvos.map((s) => ({ texto: s.texto, atendida: s.atendida })));
      toast("Condicionantes salvas com sucesso", "success");
    } catch {
      toast("Erro ao salvar condicionantes", "error");
    } finally {
      setSaving(false);
    }
  }

  function preview() {
    window.open(`/api/relatorios/condicionantes/${processoId}`, "_blank");
  }

  async function baixar() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/relatorios/condicionantes/${processoId}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `relatorio-condicionantes-${processoId}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast("Erro ao gerar relatório", "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-ink-500)]">
          Edite as condicionantes vinculadas a este processo e marque se cada uma foi atendida.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={preview}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <Eye size={14} /> Visualizar
          </button>
          <button
            type="button"
            onClick={baixar}
            disabled={downloading}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)] disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Baixar PDF
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-paper-200)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-paper-100)] text-left text-xs font-medium text-[var(--color-ink-500)]">
              <th className="px-3 py-2">Condicionante</th>
              <th className="w-32 px-3 py-2 text-center">Atendida</th>
              <th className="w-12 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-[var(--color-ink-500)]">
                  Nenhuma condicionante registrada.
                </td>
              </tr>
            )}
            {itens.map((item, index) => (
              <tr key={index} className="border-t border-[var(--color-paper-200)] align-top">
                <td className="px-3 py-2">
                  <textarea
                    value={item.texto}
                    onChange={(e) => updateTexto(index, e.target.value)}
                    rows={2}
                    placeholder="Descreva a condicionante..."
                    className="w-full resize-y rounded-lg border border-[var(--color-paper-200)] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <label className="inline-flex cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={item.atendida}
                      onChange={(e) => updateAtendida(index, e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--color-paper-200)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
                    />
                  </label>
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="focus-ring rounded p-1 text-[var(--color-ink-400)] hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover condicionante"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addItem}
          className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        >
          <Plus size={14} /> Adicionar condicionante
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar alterações
        </button>
      </div>

      {itens.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]">
          <FileCheck2 size={12} />
          {itens.filter((i) => i.atendida).length} de {itens.length} condicionante(s) atendida(s)
        </div>
      )}
    </div>
  );
}
