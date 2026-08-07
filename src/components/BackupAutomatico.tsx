"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";

const INTERVALO_BACKUP_DIAS = 15;

export default function BackupAutomatico() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const jaVerifiquei = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const perfil = (session?.user as { perfil?: string })?.perfil;
    if (perfil !== "admin" && perfil !== "socio") return;
    if (jaVerifiquei.current) return;
    jaVerifiquei.current = true;

    (async () => {
      try {
        const res = await fetch("/api/backup?check=true");
        if (!res.ok) return;
        const data = await res.json();

        const deveBaixar = () => {
          if (!data.ultimoBackupEm) return true;
          const ultimo = new Date(data.ultimoBackupEm).getTime();
          if (isNaN(ultimo)) return true;
          const dias = (Date.now() - ultimo) / 86400000;
          return dias >= INTERVALO_BACKUP_DIAS;
        };

        if (!deveBaixar()) return;

        toast(`Fazendo backup automático (intervalo de ${INTERVALO_BACKUP_DIAS} dias atingido)...`, "info");
        const a = document.createElement("a");
        a.href = "/api/backup";
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        // backup automático falhou; não incomodar o usuário
      }
    })();
  }, [status, session, toast]);

  return null;
}
