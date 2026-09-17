import type { Metadata } from "next";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { BackofficeShell } from "../components/backoffice-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vida Sobrenatural — Backoffice",
  description: "Panel de administración de Vida Sobrenatural.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations('nav');
  return (
    <html
      lang="es"
      // next-themes cambia la clase del <html> del lado del cliente antes de
      // la hidratación — este warning de React es esperado (FR-026).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          Primer elemento enfocable de toda página — FR-010. Envuelto en un
          <nav> propio para que axe ("region") no lo marque como contenido
          fuera de un landmark.
        */}
        <nav aria-label={t('accesibilidad')}>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t('saltarAlContenido')}
          </a>
        </nav>
        <NextIntlClientProvider>
          <Providers>
            <BackofficeShell>{children}</BackofficeShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
