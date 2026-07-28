import { Topbar } from "@/components/Topbar";
import { prisma } from "@/lib/prisma";
import { Settings, Users, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const totalUsuarios = await prisma.usuario.count();
  const logsRecentes = await prisma.logAuditoria.findMany({
    take: 10,
    orderBy: { criadoEm: "desc" },
    include: { usuario: { select: { nome: true } } },
  });

  return (
    <>
      <Topbar title="Configurações" subtitle="Administração do sistema" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg p-2.5 bg-[var(--color-brand-50)]">
              <Users size={20} className="text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Usuários</h2>
              <p className="text-sm text-[var(--color-ink-500)]">{totalUsuarios} cadastrado(s)</p>
            </div>
          </div>
          <a href="/usuarios" className="focus-ring transition-brand text-sm font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
            Gerenciar usuários →
          </a>
        </div>

        <div className="shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-lg p-2.5 bg-[var(--color-brand-50)]">
              <Shield size={20} className="text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Perfis de Acesso</h2>
              <p className="text-sm text-[var(--color-ink-500)]">Sócio, Técnico, Estagiário, Cliente</p>
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-500)]">
            O perfil de cada usuário define quais páginas e ações ele pode acessar.
          </p>
        </div>
      </div>

      <div className="mt-6 shadow-card rounded-[var(--radius-card)] border border-[var(--color-paper-200)] bg-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg p-2.5 bg-[var(--color-river-100)]">
            <Settings size={20} className="text-[var(--color-river-700)]" />
          </div>
          <h2 className="font-display text-base font-semibold text-[var(--color-ink-900)]">Log de Auditoria</h2>
        </div>
        {logsRecentes.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-500)]">Nenhum registro de auditoria ainda.</p>
        ) : (
          <div className="space-y-2">
            {logsRecentes.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm border-b border-[var(--color-paper-100)] pb-2 last:border-0">
                <div>
                  <span className="font-medium text-[var(--color-ink-700)]">{log.acao}</span>
                  <span className="text-[var(--color-ink-500)]"> em {log.entidade}</span>
                </div>
                <div className="text-right text-xs text-[var(--color-ink-500)]">
                  <p>{log.usuario?.nome || "Sistema"}</p>
                  <p>{new Date(log.criadoEm).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
