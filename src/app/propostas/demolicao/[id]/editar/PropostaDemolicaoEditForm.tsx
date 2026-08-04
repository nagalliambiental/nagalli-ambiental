"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { UF_OPTIONS, formatarMoeda, numeroParaExtenso } from "@/lib/templates/proposta-demolicao/config";

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
  valorUnitPgrcc: number;
  valorUnitRgrcc: number;
  percentualDesconto: number | null;
  valorDesconto: number | null;
  totalCalculado: number | null;
  totalFinal: number | null;
  observacoes: string | null;
}

interface FormData {
  engenheiroNome: string;
  empresaNome: string;
  bairro: string;
  cidade: string;
  uf: string;
  quantidadePgrcc: number;
  quantidadeRgrcc: number;
  valorUnitPgrcc: number;
  valorUnitRgrcc: number;
  percentualDesconto: number;
  valorDesconto?: number;
  totalFinal?: number;
  observacoes?: string;
}

interface Calculados {
  valorTotalPgrcc: number;
  valorTotalRgrcc: number;
  totalCalculado: number;
  valorDesconto: number;
  totalComDesconto: number;
}

export default function PropostaDemolicaoEditForm({ proposta }: { proposta: Proposta }) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isRevision, setIsRevision] = useState(false);

  const [form, setForm] = useState<FormData>({
    engenheiroNome: proposta.engenheiroNome,
    empresaNome: proposta.empresaNome,
    bairro: proposta.bairro,
    cidade: proposta.cidade,
    uf: proposta.uf,
    quantidadePgrcc: proposta.quantidadePgrcc,
    quantidadeRgrcc: proposta.quantidadeRgrcc,
    valorUnitPgrcc: proposta.valorUnitPgrcc,
    valorUnitRgrcc: proposta.valorUnitRgrcc,
    percentualDesconto: proposta.percentualDesconto ?? 18,
    totalFinal: proposta.totalFinal ?? undefined,
    observacoes: proposta.observacoes ?? "",
  });

  const valorTotalPgrcc = (form.valorUnitPgrcc * form.quantidadePgrcc) / 0.82;
  const valorTotalRgrcc = (form.valorUnitRgrcc * form.quantidadeRgrcc) / 0.82;
  const totalCalculado = valorTotalPgrcc + valorTotalRgrcc;
  const valorDesconto = totalCalculado * (form.percentualDesconto / 100);
  const totalComDesconto = totalCalculado - valorDesconto;

  const calculados: Calculados = {
    valorTotalPgrcc,
    valorTotalRgrcc,
    totalCalculado,
    valorDesconto,
    totalComDesconto,
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const montarPayload = () => ({
    ...form,
    isRevision,
    totalCalculado: calculados.totalCalculado,
    valorDesconto: calculados.valorDesconto,
    totalFinal: form.totalFinal ?? calculados.totalComDesconto,
  });

  const salvar = async () => {
    const res = await fetch(`/api/propostas-demolicao/${proposta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(montarPayload()),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erro ao salvar proposta");
    }

    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = await salvar();
      toast(isRevision ? "Revisão salva com sucesso!" : "Proposta atualizada!", "success");
      router.push(`/propostas/demolicao/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar proposta", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGerar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = await salvar();

      const gerarRes = await fetch(`/api/propostas-demolicao/${data.id}/gerar`, {
        method: "POST",
      });

      if (!gerarRes.ok) throw new Error("Erro ao gerar documento");

      const blob = await gerarRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proposta_Demolicao_${data.numero}_${data.ano}_REV${String(data.revisao).padStart(2, "0")}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast(isRevision ? "Revisão salva e documento gerado!" : "Proposta salva e documento gerado!", "success");
      router.push(`/propostas/demolicao/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar proposta", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const parseCurrencyInput = (value: string) => {
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ink-900">
          Editar Proposta PGRCC/RGRCC — Demolição
        </h2>
        <p className="text-ink-500 mt-1">
          Identificação: {proposta.numero} / {proposta.ano} – REV. {String(proposta.revisao).padStart(2, "0")}
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-ink-700 bg-amber-50 border border-amber-200 rounded p-3">
          <input
            type="checkbox"
            checked={isRevision}
            onChange={(e) => setIsRevision(e.target.checked)}
            className="h-4 w-4 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <strong>Marcar como revisão</strong> — salva como REV. {String(proposta.revisao + 1).padStart(2, "0")}
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Engenheiro Responsável *</label>
          <input
            type="text"
            value={form.engenheiroNome}
            onChange={(e) => handleChange("engenheiroNome", e.target.value)}
            className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Empresa *</label>
          <input
            type="text"
            value={form.empresaNome}
            onChange={(e) => handleChange("empresaNome", e.target.value)}
            className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Bairro *</label>
          <input
            type="text"
            value={form.bairro}
            onChange={(e) => handleChange("bairro", e.target.value)}
            className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">Cidade *</label>
          <input
            type="text"
            value={form.cidade}
            onChange={(e) => handleChange("cidade", e.target.value)}
            className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1">UF *</label>
          <select
            value={form.uf}
            onChange={(e) => handleChange("uf", e.target.value)}
            className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          >
            {UF_OPTIONS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-paper-200 pt-6">
        <h3 className="text-lg font-semibold text-ink-900 mb-4">Itens da Proposta</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-50 text-left">
                <th className="p-2 font-medium">Item</th>
                <th className="p-2 font-medium">Descrição</th>
                <th className="p-2 font-medium text-center">Qtd</th>
                <th className="p-2 font-medium text-center">Und</th>
                <th className="p-2 font-medium text-center">V. Unitário (HT)</th>
                <th className="p-2 font-medium text-center">D.A. %</th>
                <th className="p-2 font-medium text-right">V. Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-paper-200">
                <td className="p-2 font-medium">1</td>
                <td className="p-2">Elaboração de PGRCC para obra de demolição</td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantidadePgrcc}
                    onChange={(e) => handleChange("quantidadePgrcc", Number(e.target.value))}
                    className="w-16 rounded border border-ink-300 px-2 py-1 text-center focus:border-brand-500"
                  />
                  <div className="text-xs text-ink-500 mt-1">({numeroParaExtenso(form.quantidadePgrcc)})</div>
                </td>
                <td className="p-2 text-center">HT</td>
                <td className="p-2 text-right">
                  <input
                    type="text"
                    value={formatCurrencyInput(form.valorUnitPgrcc)}
                    onChange={(e) => handleChange("valorUnitPgrcc", parseCurrencyInput(e.target.value))}
                    className="w-28 rounded border border-ink-300 px-2 py-1 text-right focus:border-brand-500"
                  />
                </td>
                <td className="p-2 text-center">18%</td>
                <td className="p-2 text-right font-medium text-brand-600">
                  {formatarMoeda(calculados.valorTotalPgrcc)}
                </td>
              </tr>

              <tr className="border-t border-paper-200">
                <td className="p-2 font-medium">2</td>
                <td className="p-2">Elaboração de RGRCC para obra de demolição</td>
                <td className="p-2 text-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantidadeRgrcc}
                    onChange={(e) => handleChange("quantidadeRgrcc", Number(e.target.value))}
                    className="w-16 rounded border border-ink-300 px-2 py-1 text-center focus:border-brand-500"
                  />
                  <div className="text-xs text-ink-500 mt-1">({numeroParaExtenso(form.quantidadeRgrcc)})</div>
                </td>
                <td className="p-2 text-center">HT</td>
                <td className="p-2 text-right">
                  <input
                    type="text"
                    value={formatCurrencyInput(form.valorUnitRgrcc)}
                    onChange={(e) => handleChange("valorUnitRgrcc", parseCurrencyInput(e.target.value))}
                    className="w-28 rounded border border-ink-300 px-2 py-1 text-right focus:border-brand-500"
                  />
                </td>
                <td className="p-2 text-center">18%</td>
                <td className="p-2 text-right font-medium text-brand-600">
                  {formatarMoeda(calculados.valorTotalRgrcc)}
                </td>
              </tr>

              <tr className="border-t border-paper-200 bg-gray-50">
                <td className="p-2 font-medium">3</td>
                <td className="p-2">Anotação de Responsabilidade Técnica CREA-PR</td>
                <td className="p-2 text-center">—</td>
                <td className="p-2 text-center">—</td>
                <td className="p-2 text-center">inclusa</td>
                <td className="p-2 text-center">—</td>
                <td className="p-2 text-right font-medium text-brand-600">incluso</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-brand-50 font-bold">
                <td colSpan={6} className="p-2 text-right">Total Calculado:</td>
                <td className="p-2 text-right text-brand-600">{formatarMoeda(calculados.totalCalculado)}</td>
              </tr>
              <tr className="bg-brand-50">
                <td colSpan={6} className="p-2 text-right">
                  Desconto ({form.percentualDesconto}%):
                </td>
                <td className="p-2 text-right text-red-600">
                  -{formatarMoeda(calculados.valorDesconto)}
                </td>
              </tr>
              <tr className="bg-brand-100">
                <td colSpan={6} className="p-2 text-right">Total com Desconto:</td>
                <td className="p-2 text-right text-lg text-brand-700">
                  {formatarMoeda(calculados.totalComDesconto)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">% Desconto</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.percentualDesconto}
              onChange={(e) => handleChange("percentualDesconto", Number(e.target.value))}
              className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Valor Final Ajustado (opcional)</label>
            <input
              type="text"
              value={form.totalFinal ? formatCurrencyInput(form.totalFinal) : ""}
              onChange={(e) => handleChange("totalFinal", parseCurrencyInput(e.target.value))}
              placeholder={formatarMoeda(calculados.totalComDesconto)}
              className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-xs text-ink-500 mt-1">
              Deixe em branco para usar o valor com desconto.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Valor HT (R$)</label>
            <input
              type="text"
              value={formatCurrencyInput(form.valorUnitPgrcc)}
              className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              readOnly
            />
            <p className="text-xs text-ink-500 mt-1">Valor SENGE-PR (3% de 6 salários mínimos).</p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-700 mb-1">Observações</label>
        <textarea
          value={form.observacoes}
          onChange={(e) => handleChange("observacoes", e.target.value)}
          rows={3}
          className="w-full rounded border border-ink-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          placeholder="Observações adicionais..."
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-paper-200">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Salvando..." : "Salvar Proposta"}
        </button>
        <button
          type="button"
          onClick={handleGerar}
          disabled={submitting}
          className="px-6 py-2 bg-brand-700 text-white rounded hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Gerando..." : "Salvar e Gerar DOCX"}
        </button>
        <a
          href={`/propostas/demolicao/${proposta.id}`}
          className="px-6 py-2 border border-ink-300 text-ink-700 rounded hover:bg-gray-50"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
