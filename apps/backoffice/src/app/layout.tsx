import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "../auth";
import { Providers } from "./providers";
import { BackofficeShell } from "../components/backoffice-shell";
import { PantallaSinSesion } from "../components/pantalla-sin-sesion";

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

/**
 * H-116 (revisión manual): el chequeo de sesión sube acá — un solo lugar,
 * no nueve copias por `page.tsx` (y otras ocho sin ninguna). Sin sesión,
 * se muestra `PantallaSinSesion` (una sola pantalla real, no un `<h1>`
 * suelto por página) en vez de `children`; con sesión, `BackofficeShell`
 * sigue decidiendo el sidebar como antes. El chequeo de ROL se queda en
 * cada página (cada una pide un rol distinto) — lo único que sube es
 * "¿hay sesión o no?". `session` se pasa a `Providers`/`SessionProvider`
 * para que el cliente no vuelva a pedirla (evita el parpadeo de
 * `status: 'loading'`).
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const t = await getTranslations('nav');
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
          <Providers session={session}>
            {session ? (
              <BackofficeShell>{children}</BackofficeShell>
            ) : (
              // Sin Sidebar acá — no hay otro <main> en juego, así que este
              // es el único landmark "main" de la página (mismo criterio
              // que tenía BackofficeShell para este caso).
              <main id="contenido" className="flex-1">
                <PantallaSinSesion />
              </main>
            )}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
