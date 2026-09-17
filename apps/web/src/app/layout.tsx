import type { Metadata } from "next";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // La URL base nunca se escribe en el código (D85) — necesaria para que las
  // vistas previas de Open Graph/Twitter resuelvan URLs absolutas. Reutiliza
  // NEXTAUTH_URL (ya es la URL pública de esta app), sin agregar otra
  // variable de entorno redundante.
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3001"),
  title: "Vida Sobrenatural",
  description: "Iglesia Vida Sobrenatural — La Plata.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Sin auth() acá a propósito: este layout raíz también envuelve las
  // páginas públicas de (publica), que deben poder servirse estáticas
  // (SSG) para SEO/performance (Historia 7) — leer la sesión acá las
  // volvería dinámicas a todas. La hidratación del tema sin flash para
  // quien tiene sesión vive en (app)/layout.tsx (T078).
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
          <nav> propio (en vez de flotar directo en <body>) para que axe
          ("region": todo el contenido debe estar contenido por landmarks) no
          lo marque como contenido fuera de un landmark.
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
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
