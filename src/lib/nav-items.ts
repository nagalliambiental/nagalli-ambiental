import {
  LayoutDashboard,
  Building2,
  FileStack,
  Settings,
  CalendarClock,
  Map,
  FileCheck2,
  Users,
  DollarSign,
  ClipboardList,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Clientes", href: "/clientes", icon: Building2 },
  { label: "Empreendimentos", href: "/empreendimentos", icon: Map },
  { label: "Processos", href: "/processos", icon: FileCheck2 },
  { label: "Exigências", href: "/exigencias", icon: ClipboardList },
  { label: "Documentos", href: "/documentos", icon: FileStack },
  { label: "Modelos", href: "/modelos", icon: FileText },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign, adminOnly: true },
  { label: "Prazos", href: "/prazos", icon: CalendarClock },
  { label: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { label: "Usuários", href: "/usuarios", icon: Users, adminOnly: true },
  { label: "Configurações", href: "/configuracoes", icon: Settings, adminOnly: true },
];
