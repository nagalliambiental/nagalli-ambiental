import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import SessionProvider from "@/components/SessionProvider";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nagalli Ambiental - Sistema de Gestão",
  description: "Sistema de controle de processos de consultoria ambiental",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <SessionProvider>
          <AppChrome>
            <ToastProvider>{children}</ToastProvider>
          </AppChrome>
        </SessionProvider>
      </body>
    </html>
  );
}
