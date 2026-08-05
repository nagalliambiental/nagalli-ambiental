"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  User,
  Package,
  BadgeDollarSign,
  MessageSquare,
  Loader2,
  FileDown,
  ArrowLeft,
  Calculator,
} from "lucide-react";
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

const ICONES_GRUPO: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  "Dados do Destinatário": User,
  "Itens da Proposta": Package,
  Investimento: BadgeDollarSign,
  Observações: MessageSquare,
};

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
      <div className="mx-auto max-w-4xl p-6">
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
    `input-field ${camposInvalidos[name] ? "input-error" : ""}`;

  const labelClass = "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-paper-200)] bg-white text-[var(--color-brand-600)] shadow-card">
            <FileText size={22} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink-900)]">
              {propostaId ? `Editar ${modelo.nome}` : `Nova ${modelo.nome}`}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-500)]">{modelo.descricao}</p>
          </div>
        </div>
      </header>

      {propostaId && revisaoAtual != null && (
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-[var(--color-brand-500)] px-2 py-0.5 text-xs font-semibold text-white">
              REV. {String(revisaoAtual).padStart(2, "0")}
            </span>
            <p className="text-sm font-medium text-[var(--color-ink-700)]">
              Proposta {propostaId} — documento atual
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--color-ink-700)]">
            <input
              type="checkbox"
              checked={isRevision}
              onChange={(e) => setIsRevision(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-paper-200)] text-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-500)]"
            />
            Gerar nova revisão (REV. {String(revisaoAtual + 1).padStart(2, "0")})
          </label>
        </section>
      )}

      {grupos.map((grupo) => {
        const Icone = ICONES_GRUPO[grupo] ?? FileText;
        return (
          <section
            key={grupo}
            className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white"
          >
            <header className="flex items-center gap-3 border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-5 py-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-paper-200)] bg-white text-[var(--color-brand-600)]">
                <Icone size={18} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">{grupo}</h3>
                <p className="text-xs text-[var(--color-ink-500)]">
                  {grupo === "Dados do Destinatário"
                    ? "Identificação do responsável e endereço da obra"
                    : grupo === "Itens da Proposta"
                      ? "Quantidades e valores unitários dos serviços"
                      : grupo === "Investimento"
                        ? "Desconto e ajuste do valor final"
                        : "Informações complementares"}
                </p>
              </div>
            </header>
            <div className="grid gap-5 p-5 md:grid-cols-2">
              {modelo.campos
                .filter((c) => (c.grupo ?? "Geral") === grupo)
                .map((campo) => {
                  const valor = dados[campo.name];
                  return (
                    <div key={campo.name} className={campo.tipo === "textarea" ? "md:col-span-2" : ""}>
                      <label className={labelClass}>
                        {campo.label} {campo.required && <span className="text-red-600">*</span>}
                      </label>
                      {campo.tipo === "textarea" ? (
                        <textarea
                          value={String(valor ?? "")}
                          onChange={(e) => handleChange(campo.name, e.target.value)}
                          rows={4}
                          className={`${inputClass(campo.name)} resize-none`}
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
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-500)]">{campo.dica}</p>
                      )}
                      {camposInvalidos[campo.name] && (
                        <p className="mt-1.5 text-xs font-medium text-red-600">Campo obrigatório</p>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        );
      })}

      {resumo.length > 0 && (
        <section className="shadow-card overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
          <header className="flex items-center gap-3 border-b border-[var(--color-paper-200)] bg-[var(--color-brand-50)] px-5 py-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--color-brand-600)]">
              <Calculator size={18} />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
                Resumo do Investimento
              </h3>
              <p className="text-xs text-[var(--color-ink-500)]">Cálculo automático atualizado em tempo real</p>
            </div>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[var(--color-paper-100)]">
                {resumo.map((linha, i) => (
                  <tr
                    key={i}
                    className={linha.destaque ? "bg-[var(--color-brand-100)]" : "transition-colors hover:bg-[var(--color-paper-50)]"}
                  >
                    <td className={`px-5 py-3 ${linha.destaque ? "font-bold text-[var(--color-ink-900)]" : "text-[var(--color-ink-700)]"}`}>
                      {linha.label}
                    </td>
                    <td
                      className={`px-5 py-3 text-right ${
                        linha.destaque
                          ? "font-bold text-[var(--color-brand-700)]"
                          : linha.negativo
                            ? "text-red-600"
                            : "font-medium text-[var(--color-ink-900)]"
                      }`}
                    >
                      {linha.valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="flex flex-col-reverse gap-3 border-t border-[var(--color-paper-200)] pt-6 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/propostas"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-ink-700)] shadow-sm transition-colors hover:bg-[var(--color-paper-50)]"
        >
          <ArrowLeft size={16} />
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-brand-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {submitting ? "Salvando..." : "Salvar Proposta"}
        </button>
        <button
          type="button"
          onClick={handleGerar}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
          {submitting ? "Gerando..." : "Salvar e Gerar DOCX"}
        </button>
      </footer>
    </form>
  );
}
