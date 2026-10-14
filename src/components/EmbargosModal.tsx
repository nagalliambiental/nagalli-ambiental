"use client";

import { useState } from "react";
import { X, Loader2, ScrollText } from "lucide-react";
import { useToast } from "@/components/Toast";

export interface EmbargosInitial {
  razaoSocial: string;
  cnpj: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  tipoLicenca: string;
  municipioData: string;
  dia: string;
  mes: string;
  ano: string;
}

const inputClass =
  "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";
const labelClass = "block text-xs font-medium text-[var(--color-ink-700)] mb-1";

export function EmbargosModal({
  processoId,
  initial,
}: {
  processoId: number;
  initial: EmbargosInitial;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [form, setForm] = useState(initial);

  function set(campo: keyof EmbargosInitial, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setGerando(true);
    try {
      const endereco = [form.rua, form.numero].filter(Boolean).join(", ")
        ? [
            [form.rua, form.numero].filter(Boolean).join(", "),
            form.complemento,
            form.bairro,
            [form.municipio, form.uf].filter(Boolean).join("/"),
          ]
            .filter(Boolean)
            .join(", ")
        : "";
      const res = await fetch(`/api/processos/${processoId}/embargos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razao_social: form.razaoSocial,
          cnpj: form.cnpj,
          endereco,
          tipo_licenca: form.tipoLicenca,
          municipio_data: form.municipioData,
          dia: form.dia,
          mes: form.mes,
          ano: form.ano,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Falha ao gerar a declaração", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `declaracao-embargos-${processoId}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Declaração de embargos gerada", "success");
      setOpen(false);
    } catch {
      toast("Falha ao gerar a declaração", "error");
    } finally {
      setGerando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setForm(initial);
          setOpen(true);
        }}
        className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
      >
        <ScrollText size={14} />
        Declaração de embargos
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-ink-900)]">
                  Declaração de embargos
                </h3>
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                  Confira e ajuste os campos — eles vêm preenchidos com os dados do cliente e da licença.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={gerar} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Razão social</label>
                  <input value={form.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>CNPJ</label>
                  <input value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Tipo de licença</label>
                  <input value={form.tipoLicenca} onChange={(e) => set("tipoLicenca", e.target.value)} className={inputClass} required />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[var(--color-ink-700)]">Endereço</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2">
                    <label className={labelClass}>Rua</label>
                    <input value={form.rua} onChange={(e) => set("rua", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Número</label>
                    <input value={form.numero} onChange={(e) => set("numero", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Complemento</label>
                    <input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Bairro</label>
                    <input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Município</label>
                    <input value={form.municipio} onChange={(e) => set("municipio", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>UF</label>
                    <input value={form.uf} onChange={(e) => set("uf", e.target.value)} className={inputClass} maxLength={2} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[var(--color-ink-700)]">Local e data</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className={labelClass}>Município</label>
                    <input value={form.municipioData} onChange={(e) => set("municipioData", e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Dia</label>
                    <input value={form.dia} onChange={(e) => set("dia", e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Mês</label>
                    <input value={form.mes} onChange={(e) => set("mes", e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Ano</label>
                    <input value={form.ano} onChange={(e) => set("ano", e.target.value)} className={inputClass} required />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="focus-ring transition-brand rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={gerando}
                  className="focus-ring transition-brand flex items-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
                >
                  {gerando ? <Loader2 size={14} className="animate-spin" /> : null}
                  {gerando ? "Gerando..." : "Gerar declaração"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
