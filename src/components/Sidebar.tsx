"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

const menuItems = [
  { href: "/", label: "Dashboard", icon: "□" },
  { href: "/clientes", label: "Clientes", icon: "●" },
  { href: "/empreendimentos", label: "Empreendimentos", icon: "▲" },
  { href: "/processos", label: "Processos", icon: "◆" },
  { href: "/exigencias", label: "Exigências", icon: "○" },
  { href: "/documentos", label: "Documentos", icon: "▬" },
  { href: "/financeiro", label: "Financeiro", icon: "♦" },
  { href: "/legislacao", label: "Legislação", icon: "★" },
  { href: "/tarefas", label: "Tarefas", icon: "▪" },
  { href: "/usuarios", label: "Usuários", icon: "◉" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const perfil = (session?.user as { perfil?: string })?.perfil;

  return (
    <aside className="w-64 bg-emerald-900 text-white flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-emerald-700 flex items-center gap-3">
        <Image
          src="/Logo1.jpeg"
          alt="Nagalli Ambiental"
          width={40}
          height={40}
          className="rounded"
        />
        <div>
          <h1 className="font-bold text-sm leading-tight">Nagalli</h1>
          <p className="text-xs text-emerald-300">Ambiental</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.href === "/usuarios" && perfil !== "socio") return null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-emerald-800 text-white font-medium border-r-2 border-emerald-400"
                  : "text-emerald-200 hover:bg-emerald-800 hover:text-white"
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-emerald-700">
        <div className="text-xs text-emerald-300 mb-2">
          {session?.user?.email}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-emerald-200 hover:text-white transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
