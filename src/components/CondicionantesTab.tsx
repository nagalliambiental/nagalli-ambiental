"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown, Plus, Upload, FileText, CheckCircle2, Circle, Trash2,
  Loader2, Download, Sparkles, X, Pencil,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface DocItem {
  id: number;
  nome: string;
  tamanho: number;
  criadoEm: string | Date;
}

interface ItemCondicao {
  id: number;
  titulo: string;
  descricao: string | null;
  cumprida: boolean;
  ordem: number;
  origem: string;
  documentos: DocItem[];
}

function fmtTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function CondicionantesTab({ processoId, textoLegado }: { processoId: number; textoLegado?: string | null }) {
  const { toast } = useToast();
  const [itens, setItens] = useState<ItemCondicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<number | null>(null);
  const [novaTitulo, setNovaTitulo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [criando, setCriando] = useState(false);
  const [extraindo, setExtraindo] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/processos/${processoId}/condicionantes`);
      if (res.ok) setItens(await res.json());
    } catch {
      toast("Falha ao carregar as condicionantes", "error");
    }
  }, [processoId, toast]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch(`/api/processos/${processoId}/condicionantes`, { signal: controller.signal });
        if (res.ok) setItens(await res.json());
      } catch {
        if (!controller.signal.aborted) toast("Falha ao carregar as condicionantes", "error");
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }
    load();
    return () => controller.abort();
  }, [processoId, toast]);

  async function criar() {
    if (!novaTitulo.trim()) return toast("Informe o resumo da condicionante", "warning");
    setCriando(true);
    try {
      const res = await fetch(`/api/processos/${processoId}/condicionantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: novaTitulo, descricao: novaDescricao }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error || "Erro ao criar");
      }
      setNovaTitulo("");
      setNovaDescricao("");
      setCriando(false);
      toast("Condicionante adicionada", "success");
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao criar", "error");
    } finally {
      setCriando(false);
    }
  }

  async function extrair(file: File) {
    setExtraindo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/processos/${processoId}/condicionantes/extrair`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Falha na extração");
      toast(`${data.criados} condicionante(s) extraída(s) do documento`, "success");
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha na extração", "error");
    } finally {
      setExtraindo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function converterTexto() {
    setConvertendo(true);
    try {
      const res = await fetch(`/api/processos/${processoId}/condicionantes/converter`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Falha ao converter");
      toast(`${data.criados} condicionante(s) criada(s) a partir do texto`, "success");
      await carregar();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha ao converter", "error");
    } finally {
      setConvertendo(false);
    }
  }

  async function alternarCumprida(item: ItemCondicao) {
    setItens((atual) => atual.map((i) => (i.id === item.id ? { ...i, cumprida: !i.cumprida } : i)));
    const res = await fetch(`/api/condicionantes/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cumprida: !item.cumprida }),
    });
    if (!res.ok) {
      setItens((atual) => atual.map((i) => (i.id === item.id ? { ...i, cumprida: item.cumprida } : i)));
      toast("Falha ao atualizar", "error");
    }
  }

  async function salvarEdicao(id: number) {
    const res = await fetch(`/api/condicionantes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: editTitulo, descricao: editDescricao }),
    });
    if (!res.ok) return toast("Falha ao salvar", "error");
    setEditandoId(null);
    toast("Condicionante atualizada", "success");
    await carregar();
  }

  async function excluir(id: number) {
    if (!confirm("Remover esta condicionante? Os documentos anexados permanecem no sistema.")) return;
    const res = await fetch(`/api/condicionantes/${id}`, { method: "DELETE" });
    if (!res.ok) return toast("Falha ao remover", "error");
    setItens((atual) => atual.filter((i) => i.id !== id));
    toast("Condicionante removida", "success");
  }

  async function enviarDocumento(item: ItemCondicao, file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("tipo", "condicionante");
    body.append("processoId", String(processoId));
    body.append("condicionanteId", String(item.id));
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) return toast("Falha no upload", "error");
    toast(`Documento anexado a "${item.titulo.slice(0, 40)}"`, "success");
    await carregar();
  }

  const cumpridas = itens.filter((i) => i.cumprida).length;

  return (
    <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-paper-200)] px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Condicionantes</h2>
          {itens.length > 0 && (
            <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
              {cumpridas} de {itens.length} cumprida(s)
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`focus-ring transition-brand flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-river-200)] bg-[var(--color-river-50)] px-3 py-2 text-sm font-medium text-[var(--color-river-700)] hover:bg-[var(--color-river-100)] ${extraindo ? "pointer-events-none opacity-60" : ""}`}
            title="Envie PDF ou imagem da licença — se for escaneado, o OCR reconhece o texto automaticamente"
          >
            {extraindo ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {extraindo ? "Lendo documento..." : "Extrair de documento"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.bmp"
              className="hidden"
              ref={fileRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) extrair(f);
              }}
            />
          </label>
          <button
            onClick={() => setCriando(true)}
            disabled={criando}
            className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-60"
          >
            <Plus size={14} />
            Nova condicionante
          </button>
        </div>
      </div>

      {(criando || novaTitulo || novaDescricao) && (
        <div className="border-b border-[var(--color-paper-200)] bg-[var(--color-paper-50)] px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">Nova condicionante</p>
            <button onClick={() => { setCriando(false); setNovaTitulo(""); setNovaDescricao(""); }} className="focus-ring rounded p-1 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]" title="Cancelar">
              <X size={15} />
            </button>
          </div>
          <input
            value={novaTitulo}
            onChange={(e) => setNovaTitulo(e.target.value)}
            placeholder="Resumo curto (ex.: Manter licença visível na portaria)"
            className="mt-2 w-full rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:border-[var(--color-brand-500)]"
          />
          <textarea
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
            placeholder="Descrição simples da obrigação (opcional)"
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-sm focus:border-[var(--color-brand-500)]"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={criar} disabled={!novaTitulo.trim()} className="focus-ring transition-brand flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-500)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-40">
              {criando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Adicionar
            </button>
            <button onClick={() => { setCriando(false); setNovaTitulo(""); setNovaDescricao(""); }} className="focus-ring rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-ink-500)]">
          <Loader2 size={20} className="animate-spin text-[var(--color-brand-500)]" />
          Carregando...
        </div>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-5 py-12 text-center">
          <Sparkles size={26} className="mb-1 text-[var(--color-ink-300)]" />
          <p className="text-sm font-medium text-[var(--color-ink-700)]">Nenhuma condicionante cadastrada</p>
          <p className="max-w-md text-sm text-[var(--color-ink-500)]">
            Use &quot;Extrair de documento&quot; enviando a licença (PDF ou imagem) — o sistema tenta ler o texto automaticamente e identifica as condicionantes numeradas. Ou adicione manualmente.
          </p>
          {textoLegado && textoLegado.trim() && (
            <button
              onClick={converterTexto}
              disabled={convertendo}
              className="focus-ring transition-brand mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)] disabled:opacity-60"
            >
              {convertendo ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              Converter texto existente em itens
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-paper-100)]">
          {itens.map((item) => {
            const abertoEste = aberto === item.id;
            return (
              <li key={item.id} className={item.cumprida ? "bg-green-50/40" : ""}>
                <button
                  onClick={() => setAberto(abertoEste ? null : item.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[var(--color-paper-50)]"
                >
                  <ChevronDown size={16} className={`shrink-0 text-[var(--color-ink-400)] transition-transform ${abertoEste ? "" : "-rotate-90"}`} />
                  <span className="w-7 shrink-0 text-xs font-bold tabular-nums text-[var(--color-ink-400)]">{String(item.ordem).padStart(2, "0")}</span>
                  {item.cumprida ? (
                    <CheckCircle2 size={16} className="shrink-0 text-green-600" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-[var(--color-ink-300)]" />
                  )}
                  <span className={`min-w-0 flex-1 truncate text-sm ${item.cumprida ? "text-[var(--color-ink-500)] line-through" : "font-medium text-[var(--color-ink-900)]"}`} title={item.titulo}>
                    {item.titulo}
                  </span>
                  {item.origem === "extracao" && (
                    <span className="hidden shrink-0 rounded-full border border-[var(--color-river-200)] bg-[var(--color-river-50)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-river-700)] sm:inline-flex">OCR</span>
                  )}
                  {item.documentos.length > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-paper-200)] bg-[var(--color-paper-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink-600)]">
                      <FileText size={11} /> {item.documentos.length}
                    </span>
                  )}
                </button>

                {abertoEste && (
                  <div className="space-y-4 px-5 pb-5 pl-[76px] pr-5">
                    {editandoId === item.id ? (
                      <div className="space-y-2">
                        <input
                          value={editTitulo}
                          onChange={(e) => setEditTitulo(e.target.value)}
                          className="w-full rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)]"
                        />
                        <textarea
                          value={editDescricao}
                          onChange={(e) => setEditDescricao(e.target.value)}
                          rows={3}
                          placeholder="Descrição simples (opcional)"
                          className="w-full resize-none rounded-lg border border-[var(--color-paper-200)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)]"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => salvarEdicao(item.id)} className="focus-ring rounded-lg bg-[var(--color-brand-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-brand-600)]">Salvar</button>
                          <button onClick={() => setEditandoId(null)} className="focus-ring rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-600)]">
                        {item.descricao || <span className="italic text-[var(--color-ink-300)]">Sem descrição — clique em editar para adicionar.</span>}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => alternarCumprida(item)}
                        className={`focus-ring transition-brand inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${item.cumprida ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-[var(--color-paper-200)] bg-white text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"}`}
                      >
                        <CheckCircle2 size={13} />
                        {item.cumprida ? "Cumprida" : "Marcar como cumprida"}
                      </button>
                      <button
                        onClick={() => {
                          setEditandoId(item.id);
                          setEditTitulo(item.titulo);
                          setEditDescricao(item.descricao || "");
                        }}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-paper-100)]"
                      >
                        <Pencil size={13} />
                        Editar
                      </button>
                      <label className="focus-ring transition-brand inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--color-paper-200)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink-600)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-600)]">
                        <Upload size={13} />
                        Anexar documento
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) enviarDocumento(item, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        onClick={() => excluir(item.id)}
                        className="focus-ring ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                        Remover
                      </button>
                    </div>

                    {item.documentos.length > 0 && (
                      <ul className="divide-y divide-[var(--color-paper-100)] overflow-hidden rounded-lg border border-[var(--color-paper-200)]">
                        {item.documentos.map((doc) => (
                          <li key={doc.id} className="flex items-center gap-2 bg-white px-3 py-2">
                            <FileText size={14} className="shrink-0 text-[var(--color-ink-400)]" />
                            <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-ink-700)]" title={doc.nome}>{doc.nome}</span>
                            <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-400)]">{fmtTamanho(doc.tamanho)}</span>
                            <a href={`/api/documentos/${doc.id}/download`} className="focus-ring shrink-0 rounded p-1 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] hover:text-[var(--color-brand-600)]" title="Baixar">
                              <Download size={13} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
