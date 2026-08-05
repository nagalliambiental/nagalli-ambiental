"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { Loader2, Save, Plus, Trash2, UploadCloud } from "lucide-react";
import type { CampoProposta } from "@/lib/propostas/modelos";

const TIPOS_CAMPO: { value: CampoProposta["tipo"]; label: string }[] = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "moeda", label: "Moeda (R$)" },
  { value: "selecao", label: "Seleção" },
  { value: "textarea", label: "Texto longo" },
];

interface Props {
  id?: number;
  inicial?: {
    nome: string;
    descricao: string;
    prefixoArquivo: string;
    campos: CampoProposta[];
    ativo?: boolean;
  };
}

function campoVazio(): CampoProposta {
  return { name: "", label: "", tipo: "texto", grupo: "Geral" };
}

function slugizar(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PropostaModeloForm({ id, inicial }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [prefixoArquivo, setPrefixoArquivo] = useState(inicial?.prefixoArquivo ?? "");
  const [campos, setCampos] = useState<CampoProposta[]>(
    inicial?.campos?.length ? inicial.campos : [campoVazio()]
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function setCampo(idx: number, patch: Partial<CampoProposta>) {
    setCampos((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  function handleNomeCampo(campo: CampoProposta, novoNome: string) {
    const slug = slugizar(novoNome);
    setCampos((prev) =>
      prev.map((c) =>
        c === campo ? { ...c, name: slug || novoNome, label: c.label || novoNome } : c
      )
    );
  }

  function handleLabelCampo(campo: CampoProposta, novoLabel: string) {
    setCampos((prev) => prev.map((c) => (c === campo ? { ...c, label: novoLabel } : c)));
  }

  function adicionarCampo() {
    setCampos((prev) => [...prev, campoVazio()]);
  }

  function removerCampo(idx: number) {
    setCampos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast("Informe o nome do modelo", "error");
      return;
    }
    if (campos.some((c) => !c.name.trim())) {
      toast("Todos os campos precisam de uma chave (name)", "error");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("nome", nome.trim());
      formData.set("descricao", descricao.trim());
      formData.set("prefixoArquivo", prefixoArquivo.trim());
      formData.set("campos", JSON.stringify(campos));
      if (id != null) formData.set("ativo", String(inicial?.ativo ?? true));
      if (file) formData.set("file", file);

      const res = await fetch(id != null ? `/api/propostas-modelos/${id}` : "/api/propostas-modelos", {
        method: id != null ? "PUT" : "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar modelo");
      }

      toast(id != null ? "Modelo atualizado!" : "Modelo cadastrado!", "success");
      router.push("/propostas/modelos");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar modelo", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] border-[var(--color-paper-200)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6">
        <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-4">
          Dados do modelo
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
              Nome <span className="text-red-600">*</span>
            </label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: PGRS — Restaurante" className={inputCls} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
              Prefixo do arquivo
            </label>
            <input value={prefixoArquivo} onChange={(e) => setPrefixoArquivo(e.target.value)} placeholder="Ex: Proposta_PGRS" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
              Descrição
            </label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6">
        <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)] mb-1">
          Template DOCX
        </h3>
        <p className="text-sm text-[var(--color-ink-500)] mb-4">
          Envie o arquivo .docx usado como base. Use marcações como {"{campo}"} no documento, com o nome (chave) dos campos abaixo.
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[var(--color-paper-300)] bg-[var(--color-paper-50)] px-4 py-4 hover:border-[var(--color-brand-500)]">
          <UploadCloud size={20} className="text-[var(--color-brand-500)]" />
          <div className="text-sm">
            <span className="font-medium text-[var(--color-ink-700)]">
              {file ? file.name : inicial && !file ? "Substituir DOCX (opcional)" : "Selecionar arquivo .docx"}
            </span>
            <span className="block text-xs text-[var(--color-ink-500)]">
              {id != null ? "O arquivo atual será mantido se nenhum for enviado." : "Obrigatório para o modelo funcionar."}
            </span>
          </div>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--color-ink-900)]">
              Campos editáveis
            </h3>
            <p className="text-sm text-[var(--color-ink-500)]">
              Defina os campos que serão preenchidos ao criar a proposta. A chave (name) deve bater com a marcação do DOCX.
            </p>
          </div>
          <button
            type="button"
            onClick={adicionarCampo}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <Plus size={14} />
            Adicionar campo
          </button>
        </div>

        <div className="space-y-3">
          {campos.map((campo, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Chave (marcação no DOCX)</label>
                  <input
                    value={campo.name}
                    onChange={(e) => handleNomeCampo(campo, e.target.value)}
                    placeholder="ex: razaoSocial"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Rótulo exibido</label>
                  <input
                    value={campo.label}
                    onChange={(e) => handleLabelCampo(campo, e.target.value)}
                    placeholder="ex: Razão Social"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Tipo</label>
                  <select
                    value={campo.tipo}
                    onChange={(e) => setCampo(idx, { tipo: e.target.value as CampoProposta["tipo"] })}
                    className={inputCls}
                  >
                    {TIPOS_CAMPO.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Grupo</label>
                  <input
                    value={campo.grupo ?? ""}
                    onChange={(e) => setCampo(idx, { grupo: e.target.value })}
                    placeholder="Geral"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-10">
                  <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Dica / placeholder</label>
                  <input
                    value={campo.dica ?? ""}
                    onChange={(e) => setCampo(idx, { dica: e.target.value })}
                    placeholder="Texto de apoio exibido no formulário"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2 flex items-end justify-end gap-2">
                  {campo.tipo === "selecao" && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[var(--color-ink-500)] mb-1">Opções (vírgula)</label>
                      <input
                        value={(campo.opcoes ?? []).join(", ")}
                        onChange={(e) => setCampo(idx, { opcoes: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                        placeholder="Opção A, Opção B"
                        className={inputCls}
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-600)] pb-2">
                    <input
                      type="checkbox"
                      checked={Boolean(campo.required)}
                      onChange={(e) => setCampo(idx, { required: e.target.checked })}
                      className="accent-[var(--color-brand-500)]"
                    />
                    Obrigatório
                  </label>
                  <button
                    type="button"
                    onClick={() => removerCampo(idx)}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    title="Remover campo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="focus-ring transition-brand flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Salvando..." : id != null ? "Salvar alterações" : "Cadastrar modelo"}
        </button>
        <Link
          href="/propostas/modelos"
          className="rounded-lg border border-[var(--color-paper-200)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
