"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { calcularModelo, type ModeloPropostaData } from "@/lib/propostas/modelos";

interface Props {
  modelo: ModeloPropostaData;
  propostaId?: number;
  revisaoAtual?: number;
  inicial?: Record<string, unknown>;
}

const formatCurrencyInput = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const parseCurrencyInput = (value: string) => {
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
};

function valorInicial(campo: { name: string; defaultValue?: string | number }, inicial?: Record<string, unknown>): string | number {
  if (inicial?.[campo.name] != null) return inicial[campo.name] as string | number;
  return campo.defaultValue ?? "";
}

export default function PropostaServicoForm({ modelo, propostaId, revisaoAtual, inicial }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [camposInvalidos, setCamposInvalidos] = useState<Record<string, boolean>>({});
  const [dados, setDados] = useState<Record<string, unknown>>(() => {
    const estado: Record<string, unknown> = {};
    for (const campo of modelo?.campos ?? []) {
      estado[campo.name] = valorInicial(campo, inicial);
    }
    return estado;
  });

  const resumo = useMemo(() => (modelo ? calcularModelo(modelo, dados) : []), [modelo, dados]);

  if (!modelo) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-sm text-[var(--color-ink-500)]">Modelo de proposta não encontrado.</p>
      </div>
    );
  }

  const handleChange = (name: string, value: string | number) => {
    setDados((prev) => ({ ...prev, [name]: value }));
    setCamposInvalidos((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validar = (): string[] => {
    const invalidos: string[] = [];
    for (const campo of modelo.campos) {
      if (!campo.required) continue;
      const valor = dados[campo.name];
      const invalido =
        campo.tipo === "numero" || campo.tipo === "moeda"
          ? valor == null || Number(valor) <= 0
          : valor == null || String(valor).trim() === "";
      if (invalido) invalidos.push(campo.name);
    }
    return invalidos;
  };

  const buildPayload = () => ({ dados });

  const salvar = async () => {
    const res = propostaId
      ? await fetch(`/api/propostas-servico/${propostaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dados, isRevision }),
        })
      : await fetch("/api/propostas-servico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeloSlug: modelo.slug, ...buildPayload() }),
        });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erro ao salvar proposta");
    }

    return (await res.json()) as { id: number };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidos = validar();
    if (invalidos.length > 0) {
      setCamposInvalidos(Object.fromEntries(invalidos.map((n) => [n, true])));
      toast("Preencha os campos obrigatórios indicados.", "error");
      return;
    }
    setSubmitting(true);

    try {
      const data = await salvar();
      toast(propostaId ? "Proposta atualizada com sucesso!" : "Proposta criada com sucesso!", "success");
      router.push(`/propostas/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar proposta", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGerar = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidos = validar();
    if (invalidos.length > 0) {
      setCamposInvalidos(Object.fromEntries(invalidos.map((n) => [n, true])));
      toast("Preencha os campos obrigatórios indicados.", "error");
      return;
    }
    setSubmitting(true);

    try {
      const data = await salvar();

      const gerarRes = await fetch(`/api/propostas-servico/${data.id}/gerar`, {
        method: "POST",
      });

      if (!gerarRes.ok) throw new Error("Erro ao gerar documento");

      const blob = await gerarRes.blob();
      const disposition = gerarRes.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? "proposta.docx";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast("Proposta salva e documento gerado!", "success");
      router.push(`/propostas/${data.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao gerar proposta", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const grupos: string[] = [];
  for (const campo of modelo.campos) {
    const g = campo.grupo ?? "Geral";
    if (!grupos.includes(g)) grupos.push(g);
  }

  const inputClass = (name: string) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
      camposInvalidos[name]
        ? "border-red-500 focus:ring-red-400"
        : "focus:ring-[var(--color-brand-500)] border-[var(--color-paper-200)]"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-ink-900)]">
          {propostaId ? `Editar ${modelo.nome}` : `Nova ${modelo.nome}`}
        </h2>
        <p className="text-[var(--color-ink-500)] mt-1">{modelo.descricao}</p>
      </div>

      {propostaId && revisaoAtual != null && (
        <div className="rounded-lg border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-4">
          <p className="text-sm text-[var(--color-ink-700)]">
            Proposta {propostaId} — REV. {String(revisaoAtual).padStart(2, "0")}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--color-ink-700)]">
            <input
              type="checkbox"
              checked={isRevision}
              onChange={(e) => setIsRevision(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-paper-200)] text-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-500)]"
            />
            Gerar nova revisão (REV. {String(revisaoAtual + 1).padStart(2, "0")})
          </label>
        </div>
      )}

      {grupos.map((grupo) => (
        <div key={grupo} className="border-t border-[var(--color-paper-200)] pt-6">
          <h3 className="text-lg font-semibold text-[var(--color-ink-900)] mb-4">{grupo}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {modelo.campos
              .filter((c) => (c.grupo ?? "Geral") === grupo)
              .map((campo) => {
                const valor = dados[campo.name];
                return (
                  <div key={campo.name} className={campo.tipo === "textarea" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
                      {campo.label} {campo.required && <span className="text-red-600">*</span>}
                    </label>
                    {campo.tipo === "textarea" ? (
                      <textarea
                        value={String(valor ?? "")}
                        onChange={(e) => handleChange(campo.name, e.target.value)}
                        rows={3}
                        className={inputClass(campo.name)}
                      />
                    ) : campo.tipo === "selecao" ? (
                      <select
                        value={String(valor ?? "")}
                        onChange={(e) => handleChange(campo.name, e.target.value)}
                        required={campo.required}
                        className={inputClass(campo.name)}
                      >
                        {(campo.opcoes ?? []).map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    ) : campo.tipo === "moeda" ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={typeof valor === "number" && valor > 0 ? formatCurrencyInput(valor) : ""}
                        onChange={(e) => handleChange(campo.name, parseCurrencyInput(e.target.value))}
                        placeholder="R$ 0,00"
                        className={inputClass(campo.name)}
                      />
                    ) : (
                      <input
                        type={campo.tipo === "numero" ? "number" : "text"}
                        step={campo.tipo === "numero" ? "any" : undefined}
                        value={String(valor ?? "")}
                        onChange={(e) =>
                          handleChange(
                            campo.name,
                            campo.tipo === "numero" ? Number(e.target.value) : e.target.value
                          )
                        }
                        placeholder={campo.placeholder}
                        required={campo.required}
                        className={inputClass(campo.name)}
                      />
                    )}
                    {campo.dica && (
                      <p className="text-xs text-[var(--color-ink-500)] mt-1">{campo.dica}</p>
                    )}
                    {camposInvalidos[campo.name] && (
                      <p className="text-xs text-red-600 mt-1">Campo obrigatório</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {resumo.length > 0 && (
        <div className="border-t border-[var(--color-paper-200)] pt-6">
          <h3 className="text-lg font-semibold text-[var(--color-ink-900)] mb-4">Resumo do Investimento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--color-paper-200)]">
                {resumo.map((linha, i) => (
                  <tr
                    key={i}
                    className={
                      linha.destaque
                        ? "bg-[var(--color-brand-100)] font-bold text-[var(--color-brand-700)]"
                        : ""
                    }
                  >
                    <td className="p-2 text-[var(--color-ink-700)]">{linha.label}</td>
                    <td
                      className={`p-2 text-right ${
                        linha.negativo ? "text-red-600" : "text-[var(--color-ink-900)]"
                      }`}
                    >
                      {linha.valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-[var(--color-paper-200)]">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-[var(--color-brand-500)] text-white rounded hover:bg-[var(--color-brand-600)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Salvando..." : "Salvar Proposta"}
        </button>
        <button
          type="button"
          onClick={handleGerar}
          disabled={submitting}
          className="px-6 py-2 bg-[var(--color-brand-600)] text-white rounded hover:bg-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Gerando..." : "Salvar e Gerar DOCX"}
        </button>
        <Link
          href="/propostas"
          className="px-6 py-2 border border-[var(--color-paper-200)] text-[var(--color-ink-700)] rounded hover:bg-[var(--color-paper-50)]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
