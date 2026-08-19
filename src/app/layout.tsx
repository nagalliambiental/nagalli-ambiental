import type { Metadata } from "next";
import { AppChrome } from "@/components/AppChrome";
import SessionProvider from "@/components/SessionProvider";
import { ToastProvider } from "@/components/Toast";
import { SyncStatusBar } from "@/lib/tauri/SyncStatusBar";
import BackupAutomatico from "@/components/BackupAutomatico";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nagalli Ambiental - Sistema de Gestão",
  description: "Sistema de controle de processos de consultoria ambiental",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <AppChrome>
            <ToastProvider>
              {children}
              <BackupAutomatico />
            </ToastProvider>
          </AppChrome>
          <SyncStatusBar />
        </SessionProvider>
      </body>
    </html>
  );
}
