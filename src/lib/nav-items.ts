import {
  LayoutDashboard,
  Building2,
  Settings,
  FileCheck2,
  BarChart3,
  ListTodo,
  Shield,
  ClipboardList,
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
      { label: "Processos", href: "/processos" },
      { label: "Exigências", href: "/exigencias" },
      { label: "DMR", href: "/dmr" },
      { label: "Prazos", href: "/prazos" },
      { label: "Modelos", href: "/modelos" },
    ],
  },
  { label: "Tarefas", href: "/tarefas", icon: ListTodo },
  {
    label: "Administrativo", icon: Settings,
    children: [
      { label: "Propostas", href: "/propostas", adminOnly: true },
      { label: "Financeiro", href: "/financeiro", adminOnly: true },
      { label: "Contratos", href: "/contratos", adminOnly: true },
      { label: "Acessos", href: "/acessos" },
      { label: "Usuários", href: "/usuarios", adminOnly: true },
      { label: "Configurações", href: "/configuracoes", adminOnly: true },
    ],
  },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
];
