"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { Leaf, Paperclip, Save } from "lucide-react";

interface AutorizacaoCorte {
  formaCompensacao: string | null;
  quantidadeIndividuos: number | null;
  compensacaoExigida: boolean;
  tipoCompensacao: string | null;
  quantidadeMudas: number | null;
  areaCompensacaoM2: number | null;
  prazoCompensacao: string | null;
  statusCompensacao: string;
  comprovante: string | null;
}

const TIPOS_COMPENSACAO = [
  "Reposição florestal",
  "Plantio compensatório",
  "Pagamento indenizatório",
  "Outro",
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "cumprida", label: "Cumprida" },
];

const empty: AutorizacaoCorte = {
  formaCompensacao: "individuos",
  quantidadeIndividuos: null,
  compensacaoExigida: false,
  tipoCompensacao: null,
  quantidadeMudas: null,
  areaCompensacaoM2: null,
  prazoCompensacao: null,
  statusCompensacao: "pendente",
  comprovante: null,
};

export default function CompensacaoCorteCard({ processoId }: { processoId: number }) {
  const { toast } = useToast();
  const [data, setData] = useState<AutorizacaoCorte>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/processos/${processoId}/corte`)
      .then((r) => r.json())
      .then((res) => {
        if (res) {
          setData({
            ...res,
            prazoCompensacao: res.prazoCompensacao ? res.prazoCompensacao.slice(0, 10) : null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [processoId]);

  const set = <K extends keyof AutorizacaoCorte>(key: K, value: AutorizacaoCorte[K]) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const salvar = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("formaCompensacao", data.formaCompensacao ?? "individuos");
      form.set("quantidadeIndividuos", data.quantidadeIndividuos?.toString() ?? "");
      form.set("compensacaoExigida", String(data.compensacaoExigida));
      form.set("tipoCompensacao", data.tipoCompensacao ?? "");
      form.set("quantidadeMudas", data.quantidadeMudas?.toString() ?? "");
      form.set("areaCompensacaoM2", data.areaCompensacaoM2?.toString() ?? "");
      form.set("prazoCompensacao", data.prazoCompensacao ?? "");
      form.set("statusCompensacao", data.statusCompensacao);
      if (file) form.set("comprovante", file);

      const res = await fetch(`/api/processos/${processoId}/corte`, {
        method: "PUT",
        body: form,
      });
      if (!res.ok) throw new Error();
      const atualizado = await res.json();
      setData({
        ...atualizado,
        prazoCompensacao: atualizado.prazoCompensacao ? atualizado.prazoCompensacao.slice(0, 10) : null,
      });
      setFile(null);
      toast("Dados de compensação salvos.", "success");
    } catch {
      toast("Erro ao salvar dados de compensação.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <p className="text-sm text-[var(--color-ink-500)]">Carregando...</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]";

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5 space-y-4">
      <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)] flex items-center gap-2">
        <Leaf size={16} />
        Compensação Ambiental
      </h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
          Quantidade de indivíduos autorizados para corte
        </label>
        <input
          type="number"
          min={0}
          className={inputClass}
          value={data.quantidadeIndividuos ?? ""}
          onChange={(e) => set("quantidadeIndividuos", e.target.value ? Number(e.target.value) : null)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-700)]">
        <input
          type="checkbox"
          checked={data.compensacaoExigida}
          onChange={(e) => set("compensacaoExigida", e.target.checked)}
        />
        Compensação ambiental exigida
      </label>

      {data.compensacaoExigida && (
        <div className="space-y-4 border-l-2 border-[var(--color-brand-100)] pl-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
              Forma de compensação
            </label>
            <div className="flex gap-4">
              {[
                { value: "individuos", label: "Por indivíduos (mudas)" },
                { value: "area", label: "Por área (m²)" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-[var(--color-ink-700)]">
                  <input
                    type="radio"
                    name="formaCompensacao"
                    value={opt.value}
                    checked={data.formaCompensacao === opt.value}
                    onChange={(e) => set("formaCompensacao", e.target.value)}
                    className="accent-[var(--color-brand-600)]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
              Tipo de compensação
            </label>
            <select
              className={inputClass}
              value={data.tipoCompensacao ?? ""}
              onChange={(e) => set("tipoCompensacao", e.target.value || null)}
            >
              <option value="">Selecione...</option>
              {TIPOS_COMPENSACAO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {data.formaCompensacao === "individuos" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
                Quantidade de mudas
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={data.quantidadeMudas ?? ""}
                onChange={(e) => set("quantidadeMudas", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
                Área de compensação (m²)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={data.areaCompensacaoM2 ?? ""}
                onChange={(e) => set("areaCompensacaoM2", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
                Prazo de compensação
              </label>
              <input
                type="date"
                className={inputClass}
                value={data.prazoCompensacao ?? ""}
                onChange={(e) => set("prazoCompensacao", e.target.value || null)}
              />
              <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                Gera automaticamente um alerta de prazo em Exigências.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
                Status
              </label>
              <select
                className={inputClass}
                value={data.statusCompensacao}
                onChange={(e) => set("statusCompensacao", e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink-700)]">
              Comprovante
            </label>
            {data.comprovante && (
              <a
                href={data.comprovante}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 flex items-center gap-1.5 text-sm text-[var(--color-brand-600)] hover:underline"
              >
                <Paperclip size={14} />
                Ver comprovante atual
              </a>
            )}
            <input
              type="file"
              className="text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      )}

      <button
        onClick={salvar}
        disabled={saving}
        className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-700)] disabled:opacity-60"
      >
        <Save size={14} />
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
