/**
 * Sync status indicator component for the Tauri desktop app.
 * Shows online/offline status and a manual sync button.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { isTauri, isOnline, forcePushAll } from "./index";
import { Cloud, CloudOff, RefreshCw, Loader2 } from "lucide-react";

export function SyncStatusBar() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!isTauri()) return;
    const ok = await isOnline();
    setOnline(ok);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    check();
    const interval = setInterval(check, 30_000);
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", () => setOnline(true));
      window.removeEventListener("offline", () => setOnline(false));
    };
  }, [check]);

  async function handleSync() {
    if (!isTauri() || syncing) return;
    setSyncing(true);
    setMsg(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
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
      {msg && (
        <span className="text-[var(--color-ink-600)]">{msg}</span>
      )}
    </div>
  );
}
