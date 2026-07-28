import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Sidebar from "@/components/Sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nagalli Ambiental - Sistema de Gestão",
  description: "Sistema de controle de processos de consultoria ambiental",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isLoginPage =
    typeof children !== "string" &&
    (children as { props?: { pathname?: string } })?.props?.pathname ===
      "/login";

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <SessionProvider>
          {session ? (
            <div className="flex w-full">
              <Sidebar />
              <main className="flex-1 bg-gray-50 overflow-auto p-6">
                {children}
              </main>
            </div>
          ) : (
            <div className="w-full">{children}</div>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
