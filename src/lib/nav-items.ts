import {
  LayoutDashboard,
  Building2,
  Settings,
  FileCheck2,
  BarChart3,
  ListTodo,
  DatabaseBackup,
  Wallet,
  Recycle,
  type LucideIcon,
} from "lucide-react";

export type NavChild = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Cadastros", icon: Building2,
    children: [
      { label: "Clientes", href: "/clientes" },
      { label: "Empreendimentos", href: "/empreendimentos" },
    ],
  },
  {
    label: "Operacional", icon: FileCheck2,
    children: [
      { label: "Licenças", href: "/processos" },
      { label: "Exigências", href: "/exigencias" },
      { label: "Prazos", href: "/prazos" },
      { label: "Modelos", href: "/modelos" },
    ],
  },
  {
    label: "SINIR", icon: Recycle,
    children: [
      { label: "DMR", href: "/dmr" },
      { label: "SINIR MTR", href: "/sinir" },
    ],
  },
  { label: "Tarefas", href: "/tarefas", icon: ListTodo },
  { label: "Backups", href: "/backups", icon: DatabaseBackup, adminOnly: true },
  {
    label: "Financeiro/Propostas", icon: Wallet,
    children: [
      { label: "Propostas", href: "/propostas", adminOnly: true },
      { label: "Modelos de Proposta", href: "/propostas/modelos", adminOnly: true },
      { label: "Financeiro", href: "/financeiro", adminOnly: true },
    ],
  },
  {
    label: "Administrativo", icon: Settings,
    children: [
      { label: "Contratos", href: "/contratos", adminOnly: true },
      { label: "Acessos", href: "/acessos" },
      { label: "Usuários", href: "/usuarios", adminOnly: true },
      { label: "Configurações", href: "/configuracoes", adminOnly: true },
    ],
  },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
];
