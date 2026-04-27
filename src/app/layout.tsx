import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";

import { AuthProvider } from "@/lib/auth";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
