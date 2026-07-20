import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Outfit } from "next/font/google";

import { AuthProvider } from "@/lib/auth";

import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Painel do Comercial · JDV",
  description: "Painel do Comercial — Jerônimo da Veiga",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
        <footer
          aria-label="Versão do aplicativo"
          className="pointer-events-none fixed right-4 bottom-3 z-[9999] inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-medium tracking-wide text-slate-900 shadow-sm backdrop-blur select-none"
        >
          <span className="font-normal opacity-60">v</span>
          <span className="font-semibold tabular-nums">1.0.10</span>
        </footer>
      </body>
    </html>
  );
}
