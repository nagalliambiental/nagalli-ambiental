"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { SectionCard } from "@/components/ui/SectionCard";
import { useToast } from "@/components/Toast";
import { Loader2, ArrowLeft, FileText, User, Building2, MapPin, Recycle, Truck, Package, Download, HardHat, CircleCheck, PenLine } from "lucide-react";
import {
  emptyPgrccIatFormData,
  CARACTERIZACAO_ROWS,
  REUTILIZACAO_ROWS,
  ACONDICIONAMENTO_ROWS,
  TRANSPORTE_ROWS,
  DESTINACAO_ROWS,
  PgrccIatFormData,
} from "@/lib/templates/pgrcc-iat/config";

type ClienteSer = Record<string, unknown> & { razaoSocial: string };
type ConfigSer = Record<string, unknown>;

interface Props {
  clienteId: number;
  clienteApelido: string;
  cliente: ClienteSer;
  configuracoes: ConfigSer | null;
}

function numero(v?: string | null): number {
  const n = parseFloat(String(v ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function fmt(v: number): string {
  if (v === 0) return "";
  const r = Math.round(v * 1000) / 1000;
  return String(r).replace(".", ",");
}

function montarEndereco(cliente: Record<string, unknown>): string {
  const partes = [
    [cliente.rua, cliente.numero].filter(Boolean).join(", "),
    cliente.bairro,
    [cliente.municipio, cliente.uf].filter(Boolean).join("/"),
    cliente.cep,
  ].filter(Boolean);
  return partes.join(", ");
}

const inputCls = "input-field w-full";
const labelCls = "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

function Campo({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </div>
  );
}

function NumCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className={`${inputCls} text-right`}
    />
  );
}

export function PgrccIatForm({ clienteId, clienteApelido, cliente, configuracoes }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState<PgrccIatFormData>(() => {
    const base = emptyPgrccIatFormData();
    const c = String;
    base.clienteRazaoSocial = c(cliente.razaoSocial ?? "");
    base.clienteNomeFantasia = c(cliente.nomeFantasia ?? "");
    base.clienteEndereco = montarEndereco(cliente);
    base.clienteCpfCnpj = c(cliente.cnpj ?? "");
    base.responsavelLegal1 = c(cliente.respLegal ?? "");
    base.responsavelLegal1Cpf = c(cliente.responsavelElaboracaoCpf ?? "");
    base.clienteTelefone = c(cliente.telefone ?? "");
    base.clienteEmail = c(cliente.email ?? "");

    const cfg = configuracoes ?? {};
    base.elabRazaoSocial = c(cfg.nomeEmpresa ?? "");
    base.elabCnpj = c(cfg.cnpj ?? "");
    base.elabResponsavelLegal = c(cfg.responsavelNome ?? "");
    base.elabEndereco = [c(cfg.responsavelEndereco ?? ""), c(cfg.responsavelBairro ?? "")].filter(Boolean).join(", ");
    base.elabTelefone = c(cfg.responsavelTelefone ?? "");
    base.elabEmail = c(cfg.responsavelEmail ?? "");

    base.respElabNome = c(cfg.responsavelNome ?? "");
    base.respElabEmpresa = c(cfg.nomeEmpresa ?? "");
    base.respElabEndereco = [c(cfg.responsavelEndereco ?? ""), c(cfg.responsavelBairro ?? "")].filter(Boolean).join(", ");
    base.respElabTelefone = c(cfg.responsavelTelefone ?? "");
    base.respElabEmail = c(cfg.responsavelEmail ?? "");
    base.respElabConselho = c(cfg.registroOrgao ?? "");
    base.respElabArt = "";
    base.respImplNome = c(cfg.responsavelNome ?? "");
    base.respImplConselho = c(cfg.registroOrgao ?? "");

    return base;
  });

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setField = <K extends keyof PgrccIatFormData>(key: K, value: PgrccIatFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const setChar = (id: string, field: "demolicao" | "construcao" | "especificar", value: string) => {
    setForm((prev) => ({
      ...prev,
      caracterizacao: prev.caracterizacao.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
    setDirty(true);
  };

  const setReutil = (id: string, field: "processo" | "quantidade" | "especificar", value: string) => {
    setForm((prev) => ({
      ...prev,
      reutilizacao: prev.reutilizacao.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
    setDirty(true);
  };

  const setAcond = (id: string, field: "forma" | "especificar", value: string) => {
    setForm((prev) => ({
      ...prev,
      acondicionamento: prev.acondicionamento.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
    setDirty(true);
  };

  const setTransp = (id: string, field: "empresa" | "licenca", value: string) => {
    setForm((prev) => ({
      ...prev,
      transporte: prev.transporte.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
    setDirty(true);
  };

  const setDest = (id: string, field: keyof (PgrccIatFormData["destinacao"][number]), value: string) => {
    setForm((prev) => ({
      ...prev,
      destinacao: prev.destinacao.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
    setDirty(true);
  };

  const aplicarEmpreendimento = (id: string) => {
    if (!id) return;
    const emp = (cliente.empreendimentos as Record<string, unknown>[]).find((e) => String(e.id) === id);
    if (!emp) return;
    setForm((prev) => ({
      ...prev,
      empNome: String(emp.apelido ?? emp.descricao ?? ""),
      empRua: String(emp.rua ?? ""),
      empNumero: String(emp.numero ?? ""),
      empBairro: String(emp.bairro ?? ""),
      empMunicipio: String(emp.municipio ?? ""),
      empIndicacaoFiscal: prev.empIndicacaoFiscal,
    }));
    setDirty(true);
    toast("Dados do empreendimento preenchidos", "success");
  };

  const charTotalLinha = (id: string): number => {
    const r = form.caracterizacao.find((x) => x.id === id);
    return numero(r?.demolicao) + numero(r?.construcao);
  };
  const classeIds: Record<string, string[]> = {
    A: ["solo", "ceramicos", "premoldados", "argamassa", "asfaltico", "outros_a"],
    B: ["plasticos", "papel", "metais", "vidros", "madeiras", "gesso", "outros_b"],
    C: ["manta", "vidro_massa", "poliuretano", "outros_c"],
    D: ["tintas", "solventes", "oleos", "amianto", "outros_d"],
  };
  const charTotalClasse = (ids: string[]) => ids.reduce((acc, id) => acc + charTotalLinha(id), 0);
  const tA = charTotalClasse(classeIds.A);
  const tB = charTotalClasse(classeIds.B);
  const tC = charTotalClasse(classeIds.C);
  const tD = charTotalClasse(classeIds.D);
  const totalSolo = charTotalLinha("solo");
  const totalGeral = tA + tB + tC + tD;

  const reutilTotalClasse = (ids: string[]) =>
    ids.reduce((acc, id) => acc + numero(form.reutilizacao.find((r) => r.id === id)?.quantidade), 0);
  const reutilA = reutilTotalClasse(classeIds.A);
  const reutilB = reutilTotalClasse(classeIds.B);
  const reutilSolo = numero(form.reutilizacao.find((r) => r.id === "solo")?.quantidade);
  const volumeClasse = {
    A: Math.max(0, tA - reutilA),
    B: Math.max(0, tB - reutilB),
    C: Math.max(0, tC - reutilTotalClasse(classeIds.C)),
    D: Math.max(0, tD - reutilTotalClasse(classeIds.D)),
  } as const;

  const empreendimentos = (cliente.empreendimentos as Record<string, unknown>[]) || [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/documentos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, templateSlug: "pgrcc-iat", formData: form }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(String(err.error || "Erro ao gerar o documento"), "error");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "PGRCC_IAT.docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDirty(false);
      toast("PGRCC IAT gerado com sucesso", "success");
      router.refresh();
    } catch {
      toast("Erro ao gerar o documento", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar
        icon={FileText}
        title={`PGRCC IAT — ${clienteApelido}`}
        subtitle="Preencha os dados do Projeto Simplificado de Gerenciamento de Resíduos da Construção Civil (PGRCC)"
        actions={
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring transition-brand flex items-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6 p-6">
        <SectionCard icon={User} title="Identificação do empreendedor" subtitle="Dados do cliente">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Campo label="Nome completo ou razão social" value={form.clienteRazaoSocial} onChange={(v) => setField("clienteRazaoSocial", v)} />
            <Campo label="Nome fantasia" value={form.clienteNomeFantasia} onChange={(v) => setField("clienteNomeFantasia", v)} />
            <Campo label="Endereço completo" value={form.clienteEndereco} onChange={(v) => setField("clienteEndereco", v)} className="md:col-span-2" />
            <Campo label="CPF / CNPJ" value={form.clienteCpfCnpj} onChange={(v) => setField("clienteCpfCnpj", v)} />
            <Campo label="Telefone" value={form.clienteTelefone} onChange={(v) => setField("clienteTelefone", v)} />
            <Campo label="E-mail" value={form.clienteEmail} onChange={(v) => setField("clienteEmail", v)} />
            <Campo label="Responsável legal 1" value={form.responsavelLegal1} onChange={(v) => setField("responsavelLegal1", v)} />
            <Campo label="CPF do responsável legal 1" value={form.responsavelLegal1Cpf} onChange={(v) => setField("responsavelLegal1Cpf", v)} />
            <Campo label="Responsável legal 2" value={form.responsavelLegal2} onChange={(v) => setField("responsavelLegal2", v)} />
            <Campo label="CPF do responsável legal 2" value={form.responsavelLegal2Cpf} onChange={(v) => setField("responsavelLegal2Cpf", v)} />
          </div>
        </SectionCard>

        <SectionCard icon={Building2} title="Empresa responsável pela elaboração do projeto" subtitle="Nossos dados">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Campo label="Razão social" value={form.elabRazaoSocial} onChange={(v) => setField("elabRazaoSocial", v)} />
            <Campo label="CNPJ" value={form.elabCnpj} onChange={(v) => setField("elabCnpj", v)} />
            <Campo label="Endereço" value={form.elabEndereco} onChange={(v) => setField("elabEndereco", v)} className="md:col-span-2" />
            <Campo label="Responsável legal" value={form.elabResponsavelLegal} onChange={(v) => setField("elabResponsavelLegal", v)} />
            <Campo label="Telefone" value={form.elabTelefone} onChange={(v) => setField("elabTelefone", v)} />
            <Campo label="E-mail" value={form.elabEmail} onChange={(v) => setField("elabEmail", v)} />
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title="Identificação e localização do empreendimento" subtitle="Selecione um empreendimento para preencher automaticamente">
          {empreendimentos.length > 0 && (
            <div className="mb-5">
              <label className={labelCls}>Empreendimento (preenchimento automático)</label>
              <select
                className={inputCls}
                defaultValue=""
                onChange={(e) => aplicarEmpreendimento(e.target.value)}
              >
                <option value="">Selecione...</option>
                {empreendimentos.map((e) => (
                  <option key={String(e.id)} value={String(e.id)}>{String(e.apelido ?? e.descricao ?? "")}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Campo label="Nome do empreendimento" value={form.empNome} onChange={(v) => setField("empNome", v)} />
            <Campo label="Nº da Indicação Fiscal" value={form.empIndicacaoFiscal} onChange={(v) => setField("empIndicacaoFiscal", v)} />
            <Campo label="Nº da Licença Prévia (LP)" value={form.empLicencaPrevia} onChange={(v) => setField("empLicencaPrevia", v)} />
            <Campo label="Modalidade do empreendimento" value={form.empModalidade} onChange={(v) => setField("empModalidade", v)} />
            <Campo label="Rua" value={form.empRua} onChange={(v) => setField("empRua", v)} />
            <Campo label="Nº" value={form.empNumero} onChange={(v) => setField("empNumero", v)} />
            <Campo label="Bairro" value={form.empBairro} onChange={(v) => setField("empBairro", v)} />
            <Campo label="Município" value={form.empMunicipio} onChange={(v) => setField("empMunicipio", v)} />
            <Campo label="Telefone" value={form.empTelefone} onChange={(v) => setField("empTelefone", v)} />
            <Campo label="E-mail" value={form.empEmail} onChange={(v) => setField("empEmail", v)} />
            <Campo label="Metragem total a ser construída (m²)" value={form.empMetragem} onChange={(v) => setField("empMetragem", v)} />
            <Campo label="Início da obra (mês/ano)" value={form.empInicioObra} onChange={(v) => setField("empInicioObra", v)} placeholder="Ex: 08/2026" />
            <Campo label="Término da obra (mês/ano)" value={form.empTerminoObra} onChange={(v) => setField("empTerminoObra", v)} placeholder="Ex: 12/2026" />
            <Campo label="Caracterização do processo construtivo" value={form.empProcessoConstrutivo} onChange={(v) => setField("empProcessoConstrutivo", v)} textarea className="md:col-span-2" />
          </div>
        </SectionCard>

        <SectionCard icon={HardHat} title="Responsáveis pelo gerenciamento de resíduos" subtitle="Elaboração e implementação do PGRCC">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
              <h4 className="text-sm font-semibold text-[var(--color-ink-900)]">Elaboração do projeto</h4>
              <Campo label="Responsável técnico" value={form.respElabNome} onChange={(v) => setField("respElabNome", v)} />
              <Campo label="Conselho de classe e nº de registro" value={form.respElabConselho} onChange={(v) => setField("respElabConselho", v)} />
              <Campo label="Nº da ART" value={form.respElabArt} onChange={(v) => setField("respElabArt", v)} />
              <Campo label="Empresa responsável" value={form.respElabEmpresa} onChange={(v) => setField("respElabEmpresa", v)} />
              <Campo label="Endereço" value={form.respElabEndereco} onChange={(v) => setField("respElabEndereco", v)} textarea />
              <Campo label="Telefone" value={form.respElabTelefone} onChange={(v) => setField("respElabTelefone", v)} />
              <Campo label="E-mail" value={form.respElabEmail} onChange={(v) => setField("respElabEmail", v)} />
            </div>
            <div className="space-y-4 rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
              <h4 className="text-sm font-semibold text-[var(--color-ink-900)]">Implementação do projeto</h4>
              <Campo label="Responsável técnico" value={form.respImplNome} onChange={(v) => setField("respImplNome", v)} />
              <Campo label="CPF" value={form.respImplCpf} onChange={(v) => setField("respImplCpf", v)} />
              <Campo label="Conselho de classe e nº de registro" value={form.respImplConselho} onChange={(v) => setField("respImplConselho", v)} />
              <Campo label="Nº da ART" value={form.respImplArt} onChange={(v) => setField("respImplArt", v)} />
              <Campo label="Empresa responsável" value={form.respImplEmpresa} onChange={(v) => setField("respImplEmpresa", v)} />
              <Campo label="Endereço" value={form.respImplEndereco} onChange={(v) => setField("respImplEndereco", v)} textarea />
              <Campo label="Telefone" value={form.respImplTelefone} onChange={(v) => setField("respImplTelefone", v)} />
              <Campo label="E-mail" value={form.respImplEmail} onChange={(v) => setField("respImplEmail", v)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Recycle} title="Caracterização e quantificação dos RCD" subtitle="Preencha os volumes (m³) por classe; os totais são calculados automaticamente">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left text-xs text-[var(--color-ink-500)]">
                  <th className="py-2 pr-2 font-medium">Classe</th>
                  <th className="py-2 pr-2 font-medium">Tipo de resíduo</th>
                  <th className="py-2 pr-2 font-medium">Especificar</th>
                  <th className="w-28 py-2 pr-2 text-right font-medium">Demolição (m³)</th>
                  <th className="w-28 py-2 pr-2 text-right font-medium">Construção (m³)</th>
                  <th className="w-24 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {CARACTERIZACAO_ROWS.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-paper-100)]">
                    <td className="py-1.5 pr-2 text-xs font-medium text-[var(--color-ink-500)]">{row.classe}</td>
                    <td className="py-1.5 pr-2 text-[var(--color-ink-700)]">{row.label}</td>
                    <td className="py-1.5 pr-2">
                      {row.outro && (
                        <input
                          type="text"
                          value={form.caracterizacao.find((r) => r.id === row.id)?.especificar ?? ""}
                          onChange={(e) => setChar(row.id, "especificar", e.target.value)}
                          placeholder="qual?"
                          className={`${inputCls} max-w-[180px]`}
                        />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumCell value={form.caracterizacao.find((r) => r.id === row.id)?.demolicao ?? ""} onChange={(v) => setChar(row.id, "demolicao", v)} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <NumCell value={form.caracterizacao.find((r) => r.id === row.id)?.construcao ?? ""} onChange={(v) => setChar(row.id, "construcao", v)} />
                    </td>
                    <td className="py-1.5 text-right font-medium text-[var(--color-ink-900)]">{fmt(charTotalLinha(row.id)) || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--color-paper-200)] font-semibold text-[var(--color-ink-900)]">
                  <td className="py-2 pr-2" colSpan={3}>TOTAL Classe A</td>
                  <td className="py-2 pr-2 text-right">{fmt(tA)}</td>
                  <td className="py-2 pr-2 text-right" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
            <div className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
              <p className="text-xs text-[var(--color-ink-500)]">Total A</p>
              <p className="font-semibold text-[var(--color-ink-900)]">{fmt(tA) || "—"}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
              <p className="text-xs text-[var(--color-ink-500)]">Total B</p>
              <p className="font-semibold text-[var(--color-ink-900)]">{fmt(tB) || "—"}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
              <p className="text-xs text-[var(--color-ink-500)]">Total C</p>
              <p className="font-semibold text-[var(--color-ink-900)]">{fmt(tC) || "—"}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
              <p className="text-xs text-[var(--color-ink-500)]">Total D</p>
              <p className="font-semibold text-[var(--color-ink-900)]">{fmt(tD) || "—"}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
              <p className="text-xs text-[var(--color-ink-500)]">Solo (A)</p>
              <p className="font-semibold text-[var(--color-ink-900)]">{fmt(totalSolo) || "—"}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-brand-500)] bg-[var(--color-brand-50)] p-3">
              <p className="text-xs text-[var(--color-brand-600)]">TOTAL A+B+C+D</p>
              <p className="font-semibold text-[var(--color-brand-700)]">{fmt(totalGeral) || "—"}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={PenLine} title="Reutilização ou reciclagem dos RCD na própria obra" subtitle="Processo/aplicação e quantidade (m³)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left text-xs text-[var(--color-ink-500)]">
                  <th className="py-2 pr-2 font-medium">Classe</th>
                  <th className="py-2 pr-2 font-medium">Tipo do resíduo</th>
                  <th className="py-2 pr-2 font-medium">Processo/Aplicação</th>
                  <th className="w-32 py-2 text-right font-medium">Quantidade (m³)</th>
                </tr>
              </thead>
              <tbody>
                {REUTILIZACAO_ROWS.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-paper-100)]">
                    <td className="py-1.5 pr-2 text-xs font-medium text-[var(--color-ink-500)]">{row.classe}</td>
                    <td className="py-1.5 pr-2 text-[var(--color-ink-700)]">{row.label}{row.outro ? ` — ${form.reutilizacao.find((r) => r.id === row.id)?.especificar ?? ""}` : ""}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={form.reutilizacao.find((r) => r.id === row.id)?.processo ?? ""}
                        onChange={(e) => setReutil(row.id, "processo", e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-1.5">
                      <NumCell value={form.reutilizacao.find((r) => r.id === row.id)?.quantidade ?? ""} onChange={(v) => setReutil(row.id, "quantidade", v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard icon={Package} title="Acondicionamento dos RCD" subtitle="Forma de acondicionamento por tipo de resíduo">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-paper-200)] text-left text-xs text-[var(--color-ink-500)]">
                  <th className="py-2 pr-2 font-medium">Classe</th>
                  <th className="py-2 pr-2 font-medium">Tipo do resíduo</th>
                  <th className="py-2 font-medium">Forma de acondicionamento</th>
                </tr>
              </thead>
              <tbody>
                {ACONDICIONAMENTO_ROWS.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-paper-100)]">
                    <td className="py-1.5 pr-2 text-xs font-medium text-[var(--color-ink-500)]">{row.classe}</td>
                    <td className="py-1.5 pr-2 text-[var(--color-ink-700)]">{row.label}{row.outro ? ` — ${form.acondicionamento.find((r) => r.id === row.id)?.especificar ?? ""}` : ""}</td>
                    <td className="py-1.5">
                      <input
                        type="text"
                        value={form.acondicionamento.find((r) => r.id === row.id)?.forma ?? ""}
                        onChange={(e) => setAcond(row.id, "forma", e.target.value)}
                        className={inputCls}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard icon={Truck} title="Transporte dos RCD" subtitle="Empresas transportadoras e licenças ambientais">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TRANSPORTE_ROWS.map((row) => (
              <div key={row.id} className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--color-ink-700)]">{row.label}</p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.transporte.find((r) => r.id === row.id)?.empresa ?? ""}
                    onChange={(e) => setTransp(row.id, "empresa", e.target.value)}
                    placeholder="Empresa"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={form.transporte.find((r) => r.id === row.id)?.licenca ?? ""}
                    onChange={(e) => setTransp(row.id, "licenca", e.target.value)}
                    placeholder="Nº da licença ambiental"
                    className={inputCls}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-5">
            <Campo label="Quantidade solo (m³)" value={form.transportesQuantidades.solo} onChange={(v) => setField("transportesQuantidades", { ...form.transportesQuantidades, solo: v })} />
            <Campo label="Quantidade A exceto solo (m³)" value={form.transportesQuantidades.excetoSolo} onChange={(v) => setField("transportesQuantidades", { ...form.transportesQuantidades, excetoSolo: v })} />
            <Campo label="Quantidade B (m³)" value={form.transportesQuantidades.b} onChange={(v) => setField("transportesQuantidades", { ...form.transportesQuantidades, b: v })} />
            <Campo label="Quantidade C (m³)" value={form.transportesQuantidades.c} onChange={(v) => setField("transportesQuantidades", { ...form.transportesQuantidades, c: v })} />
            <Campo label="Quantidade D (m³)" value={form.transportesQuantidades.d} onChange={(v) => setField("transportesQuantidades", { ...form.transportesQuantidades, d: v })} />
          </div>
          <p className="mt-2 text-xs text-[var(--color-ink-500)]">Deixe em branco para usar os totais líquidos (caracterização − reutilização/reciclagem).</p>
        </SectionCard>

        <SectionCard icon={CircleCheck} title="Destinação final dos RCD" subtitle="Por classe de resíduo — volumes = total da caracterização − reutilização/reciclagem">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {DESTINACAO_ROWS.map((row) => {
              const d = form.destinacao.find((r) => r.id === row.id)!;
              const volume = volumeClasse[row.id.toUpperCase() as keyof typeof volumeClasse];
              return (
                <div key={row.id} className="rounded-lg border border-[var(--color-paper-200)] bg-[var(--color-paper-50)] p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[var(--color-ink-900)]">{row.label}</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Campo label="Local de destinação" value={d.empresa} onChange={(v) => setDest(row.id, "empresa", v)} />
                    <Campo label="Licença/Autorização Ambiental nº" value={d.licenca} onChange={(v) => setDest(row.id, "licenca", v)} />
                    <Campo label="Endereço" value={d.endereco} onChange={(v) => setDest(row.id, "endereco", v)} />
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Órgão expedidor" value={d.orgao} onChange={(v) => setDest(row.id, "orgao", v)} />
                      <Campo label="Município (cidade/UF)" value={d.municipio} onChange={(v) => setDest(row.id, "municipio", v)} />
                      <Campo label="Validade da licença" value={d.validade} onChange={(v) => setDest(row.id, "validade", v)} />
                      <Campo label="Indicação fiscal" value={d.indicacaoFiscal} onChange={(v) => setDest(row.id, "indicacaoFiscal", v)} />
                    </div>
                    <div className="rounded-lg border border-[var(--color-brand-500)] bg-[var(--color-brand-50)] px-3 py-2 text-sm">
                      <span className="text-[var(--color-brand-600)]">Volume estimado: </span>
                      <span className="font-semibold text-[var(--color-brand-700)]">{fmt(volume) || "—"} m³</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard icon={PenLine} title="Assinatura" subtitle="Local e data">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            <Campo label="Cidade" value={form.assinaturaCidade} onChange={(v) => setField("assinaturaCidade", v)} />
            <Campo label="Dia" value={form.assinaturaDia} onChange={(v) => setField("assinaturaDia", v)} placeholder="Ex: 07" />
            <Campo label="Mês" value={form.assinaturaMes} onChange={(v) => setField("assinaturaMes", v)} placeholder="Ex: agosto" />
            <Campo label="Ano" value={form.assinaturaAno} onChange={(v) => setField("assinaturaAno", v)} placeholder="Ex: 2026" />
          </div>
        </SectionCard>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring transition-brand inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-paper-200)] bg-white px-6 py-2.5 text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-paper-100)]"
          >
            <ArrowLeft size={16} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="focus-ring transition-brand inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {saving ? "Gerando..." : "Gerar documento"}
          </button>
        </div>
      </form>
    </div>
  );
}
