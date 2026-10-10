#!/usr/bin/env node
/**
 * `pnpm dev:red` — levanta la API, la web app y el backoffice para probar desde
 * otro aparato en la misma red wifi (el celular, otra compu).
 *
 * Por qué hace falta: los `.env` apuntan a `localhost`, y desde el celular
 * `localhost` es el celular. Este script detecta la IP de esta compu en la red
 * y les pasa a las tres apps las URLs con esa IP (las variables del proceso
 * tienen prioridad sobre las de los `.env`, que no se tocan).
 *
 * Uso: `pnpm dev:red` (o `IP=192.168.0.15 pnpm dev:red` para elegir la IP).
 * Antes: `docker compose up -d` y la base cargada, como siempre (COMO-ARRANCAR).
 * El ingreso con Google no anda desde la IP (Google solo acepta las URLs
 * registradas): entrá con `/dev/entrar` o con el código por email.
 */
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';

export function ipDeLaRed(interfaces = networkInterfaces()) {
  const candidatas = [];
  for (const [nombre, direcciones] of Object.entries(interfaces)) {
    for (const d of direcciones ?? []) {
      if (d.family === 'IPv4' && !d.internal) candidatas.push({ nombre, ip: d.address });
    }
  }
  // Preferimos el wifi/ethernet típico (en0/en1 en Mac, wlan/eth en Linux) y
  // las redes privadas de casa (192.168.x.x, 10.x.x.x).
  const puntaje = ({ nombre, ip }) =>
    (/^(en|wlan|wl|eth)/.test(nombre) ? 2 : 0) + (/^(192\.168\.|10\.)/.test(ip) ? 1 : 0);
  candidatas.sort((a, b) => puntaje(b) - puntaje(a));
  return candidatas[0]?.ip ?? null;
}

function main() {
  const ip = process.env.IP || ipDeLaRed();
  if (!ip) {
    console.error('No encontré la IP de esta compu en la red. ¿Está conectada al wifi? Probá con IP=… pnpm dev:red');
    process.exit(1);
  }
  const api = `http://${ip}:3333`;
  const web = `http://${ip}:3001`;
  const backoffice = `http://${ip}:3002`;
  const origenes = `${ip},localhost`;

  const apps = [
    { nombre: 'api', args: ['--filter', 'api', 'start:dev'], env: { WEB_URL: web, API_PUBLIC_URL: api } },
    {
      nombre: 'web',
      args: ['--filter', 'web', 'dev'],
      env: { NEXTAUTH_URL: web, AUTH_URL: web, NEXT_PUBLIC_API_BASE_URL: api, DEV_ORIGENES_PERMITIDOS: origenes },
    },
    {
      nombre: 'backoffice',
      args: ['--filter', 'backoffice', 'dev'],
      env: {
        NEXTAUTH_URL: backoffice,
        AUTH_URL: backoffice,
        NEXT_PUBLIC_API_BASE_URL: api,
        NEXT_PUBLIC_WEB_APP_URL: web,
        DEV_ORIGENES_PERMITIDOS: origenes,
      },
    },
  ];

  const mostrarDirecciones = () => {
    console.log(`
    ─────────────────────────────────────────────────────────────
    Abrí estas direcciones desde el celular u otra compu
    (tienen que estar en el mismo wifi que esta compu):

      Web app     ${web}
      Backoffice  ${backoffice}
      Entrar      ${web}/dev/entrar   ·   ${backoffice}/dev/entrar

    En esta compu también andan con localhost.
    Para cortar todo: Ctrl+C.
    ─────────────────────────────────────────────────────────────
`);
  };

  // El cartel con las direcciones se repite cuando las tres apps terminan de
  // arrancar (si no, los logs lo tapan enseguida) y, por las dudas, a los 60 s.
  const LISTA = { api: /Nest application successfully started/, web: /Ready in|✓ Ready/, backoffice: /Ready in|✓ Ready/ };
  const listas = new Set();
  let yaMostrado = false;
  const mostrarSiTodasListas = () => {
    if (!yaMostrado && listas.size === apps.length) {
      yaMostrado = true;
      mostrarDirecciones();
    }
  };
  setTimeout(() => {
    if (!yaMostrado) {
      yaMostrado = true;
      mostrarDirecciones();
    }
  }, 60_000).unref();

  const hijos = apps.map(({ nombre, args, env }) => {
    const hijo = spawn('pnpm', args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const prefijo = `[${nombre}] `;
    const pasar = (destino) => (datos) => {
      const texto = datos.toString();
      destino.write(texto.split('\n').filter(Boolean).map((l) => prefijo + l).join('\n') + '\n');
      if (LISTA[nombre]?.test(texto)) {
        listas.add(nombre);
        mostrarSiTodasListas();
      }
    };
    hijo.stdout.on('data', pasar(process.stdout));
    hijo.stderr.on('data', pasar(process.stderr));
    hijo.on('exit', (codigo) => console.log(`${prefijo}terminó (código ${codigo})`));
    return hijo;
  });

  const cortar = () => {
    for (const h of hijos) h.kill('SIGINT');
    process.exit(0);
  };
  process.on('SIGINT', cortar);
  process.on('SIGTERM', cortar);

  mostrarDirecciones();
}

if (import.meta.url === `file://${process.argv[1]}`) main();
