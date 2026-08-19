/**
 * Sync status indicator component for the Tauri desktop app.
 * Shows online/offline status and a manual sync button.
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { isTauri, isOnline, forcePushAll, checkForUpdates } from "./index";
import { Cloud, CloudOff, RefreshCw, Loader2, Download } from "lucide-react";

export function SyncStatusBar() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const handleCheckUpdateRef = useRef<() => void>(() => {});

  useEffect(() => {
    handleCheckUpdateRef.current = handleCheckUpdate;
  });

  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    (async () => {
      const ok = await isOnline();
      if (active) setOnline(ok);
    })();
    // Auto-check for updates 10s after startup
    const t = setTimeout(() => handleCheckUpdateRef.current(), 10_000);
    const interval = setInterval(() => {
      isOnline().then((ok) => { if (active) setOnline(ok); });
    }, 30_000);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      active = false;
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  async function handleCheckUpdate() {
    if (!isTauri() || checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const version = await checkForUpdates();
      if (version) {
        setMsg(`Atualizado para v${version}!`);
      } else {
        setMsg("Você já está na versão mais recente");
      }
    } catch {
      setMsg("Erro ao verificar atualizações");
    } finally {
      setCheckingUpdate(false);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  async function handleSync() {
    if (!isTauri() || syncing) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setMsg("Configure NEXT_PUBLIC_API_URL no .env");
      setTimeout(() => setMsg(null), 6000);
      return;
    }
    setSyncing(true);
    setMsg(null);
    try {
      const token = "";
      const result = await forcePushAll(apiUrl, token);
      setMsg(result);
      setTimeout(() => setMsg(null), 4000);
    } catch (e: any) {
      setMsg(e?.message || "Erro ao sincronizar");
      setTimeout(() => setMsg(null), 6000);
    } finally {
      setSyncing(false);
    }
  }

  if (!isTauri()) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-[var(--color-paper-200)] bg-white px-4 py-1.5 text-xs text-[var(--color-ink-500)]">
      <div className="flex items-center gap-2">
        {online ? (
          <>
            <Cloud size={12} className="text-green-600" />
            <span>Conectado</span>
          </>
        ) : (
          <>
            <CloudOff size={12} className="text-amber-600" />
            <span>Offline — alterações salvas localmente</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCheckUpdate}
          disabled={checkingUpdate || !online}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[var(--color-ink-500)] hover:bg-[var(--color-paper-100)] disabled:opacity-40"
          title="Verificar atualizações"
        >
          {checkingUpdate ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || !online}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] disabled:opacity-40"
        >
          {syncing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>
      {msg && (
        <span className="text-[var(--color-ink-600)]">{msg}</span>
      )}
    </div>
  );
}
