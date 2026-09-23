#!/usr/bin/env node
/**
 * H-123 (revisión manual): el velo de `HeroConFoto` (packages/ui) estaba
 * bien medido, pero la medición vivía en una tabla escrita a mano dentro
 * de un comentario — nunca corrió como parte de nada, y el commit que
 * decía "script y método en el propio commit" no traía ningún script.
 * Este es ese script: mide de verdad, en cada corrida de `pnpm check`, el
 * contraste real del velo contra cada foto que de hecho se usa como
 * cabecera.
 *
 * QUÉ FOTOS MIDE (H-123/A3): no "los archivos de hero/" — las cabeceras de
 * Primeros pasos y Visitanos usan fotos de `cards/`, no de `hero/`. El
 * conjunto correcto es "las fotos que de hecho se pasan a HeroConFoto", y
 * ese conjunto vive en un solo lugar: apps/web/src/assets/images/
 * fotos-heroe.ts, el registro del que las páginas TOMAN su imagen de
 * héroe. Este script LEE el código fuente de ese archivo (no lo ejecuta:
 * es un .ts con imports de .webp, que Node no puede importar directo) y
 * extrae las rutas — si una cabecera nueva no pasa por ese registro, ni
 * esta guardia ni la página misma la conocen; agregarla al registro es lo
 * que la hace medible acá.
 *
 * DE DÓNDE SALEN LOS COLORES Y LA OPACIDAD (H-123/A4): de
 * packages/ui/src/styles/theme.css — --velo-heroe, --velo-heroe-texto,
 * --velo-heroe-opacidad. Ni el color ni el α están escritos a mano en este
 * script: si cambian en theme.css, esta guardia mide con el valor nuevo la
 * corrida siguiente, sin que nadie tenga que acordarse de actualizar dos
 * lugares.
 *
 * MÉTODO (el mismo que documentaba antes el comentario del componente):
 * cada foto se reduce a un mosaico de bloques (48×27, sharp) — el promedio
 * de brillo de cada bloque, no un píxel suelto de brillo espurio (un
 * reflejo, una luz de escenario) que ningún bloque de texto real va a
 * tapar. El bloque más claro de esa reducción es el peor caso: el velo
 * (color + opacidad, mezclados en sRGB gamma, como compone un navegador
 * `background-color` con canal alfa sobre lo que hay debajo) se aplica
 * sobre ese bloque, y el contraste resultante se mide contra
 * --velo-heroe-texto con la fórmula de luminancia relativa de WCAG 2.x.
 *
 * UMBRAL: 4.5:1 — el de texto NORMAL (WCAG 2.2 AA), no el 3:1 de texto
 * grande. El héroe siempre puede llevar un párrafo además del <h1> (Inicio
 * ya lo hace) — medir solo contra 3:1 "porque el título es grande" dejaría
 * pasar un velo que no alcanza para el párrafo. No lo bajes a 3:1 mirando
 * solo el <h1> de una página que hoy no tiene párrafo.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..');

const UMBRAL_CONTRASTE = 4.5;
const RUTA_THEME_CSS = path.join(RAIZ, 'packages/ui/src/styles/theme.css');
const RUTA_REGISTRO_FOTOS = path.join(RAIZ, 'apps/web/src/assets/images/fotos-heroe.ts');

// ---------------------------------------------------------------------
// OKLCH -> sRGB (Björn Ottosson, https://bottosson.github.io/posts/oklab/)
// ---------------------------------------------------------------------
function oklchToOklab(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}
function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [r, g, bl];
}
function linearToGamma(x) {
  const c = Math.min(1, Math.max(0, x));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}
function oklchToSrgb255(L, C, H) {
  const [ol, oa, ob] = oklchToOklab(L, C, H);
  const [lr, lg, lb] = oklabToLinearSrgb(ol, oa, ob);
  return [lr, lg, lb].map((c) => Math.round(linearToGamma(c) * 255));
}

function relLuminancia([r, g, b]) {
  const aLineal = (c) => {
    const cs = c / 255;
    return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [r, g, b].map(aLineal);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function ratioDeContraste(c1, c2) {
  const l1 = relLuminancia(c1);
  const l2 = relLuminancia(c2);
  const [alta, baja] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (alta + 0.05) / (baja + 0.05);
}

// ---------------------------------------------------------------------
// Tokens: única fuente, theme.css (H-123/A4)
// ---------------------------------------------------------------------
function leerTokenOklch(contenidoCss, nombre) {
  const regex = new RegExp(`--${nombre}:\\s*oklch\\(([^)]+)\\)`);
  const coincidencia = contenidoCss.match(regex);
  if (!coincidencia) {
    throw new Error(`No encontré --${nombre} en ${path.relative(RAIZ, RUTA_THEME_CSS)} — ¿cambió de formato?`);
  }
  const [L, C, H] = coincidencia[1].trim().split(/\s+/).map(Number);
  return { L, C, H };
}
function leerTokenPorcentaje(contenidoCss, nombre) {
  const regex = new RegExp(`--${nombre}:\\s*([\\d.]+)%`);
  const coincidencia = contenidoCss.match(regex);
  if (!coincidencia) {
    throw new Error(`No encontré --${nombre} en ${path.relative(RAIZ, RUTA_THEME_CSS)} como porcentaje — ¿cambió de formato?`);
  }
  return Number(coincidencia[1]) / 100;
}

// ---------------------------------------------------------------------
// Fotos: única fuente, el registro (H-123/A3)
// ---------------------------------------------------------------------
function extraerRutasDeFotos(contenidoTs) {
  const rutas = [];
  const regex = /from\s+['"](\.\/[^'"]+\.webp)['"]/g;
  let coincidencia;
  while ((coincidencia = regex.exec(contenidoTs))) rutas.push(coincidencia[1]);
  return rutas;
}

/**
 * Reduce la foto a un mosaico de 48×27 bloques — cada uno, el promedio de
 * brillo de esa zona (lo que hace `sharp` al reducir), no un píxel suelto.
 * Devuelve el bloque más claro: el peor caso posible para el contraste,
 * sin importar dónde caiga el texto adentro del marco.
 */
async function zonaMasClara(rutaFoto) {
  const { data, info } = await sharp(rutaFoto).resize(48, 27, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let masClaro = [0, 0, 0];
  let luminanciaMaxima = -1;
  for (let i = 0; i < data.length; i += info.channels) {
    const pixel = [data[i], data[i + 1], data[i + 2]];
    const luminancia = relLuminancia(pixel);
    if (luminancia > luminanciaMaxima) {
      luminanciaMaxima = luminancia;
      masClaro = pixel;
    }
  }
  return masClaro;
}

async function chequearContrasteVelo() {
  const contenidoTheme = readFileSync(RUTA_THEME_CSS, 'utf-8');
  const veloOklch = leerTokenOklch(contenidoTheme, 'velo-heroe');
  const textoOklch = leerTokenOklch(contenidoTheme, 'velo-heroe-texto');
  const opacidad = leerTokenPorcentaje(contenidoTheme, 'velo-heroe-opacidad');
  const veloSrgb = oklchToSrgb255(veloOklch.L, veloOklch.C, veloOklch.H);
  const textoSrgb = oklchToSrgb255(textoOklch.L, textoOklch.C, textoOklch.H);

  const contenidoRegistro = readFileSync(RUTA_REGISTRO_FOTOS, 'utf-8');
  const rutasRelativas = extraerRutasDeFotos(contenidoRegistro);
  if (rutasRelativas.length === 0) {
    throw new Error(
      `No encontré ninguna foto declarada en ${path.relative(RAIZ, RUTA_REGISTRO_FOTOS)} — ¿cambió el formato de los imports?`,
    );
  }

  const resultados = [];
  for (const rutaRelativa of rutasRelativas) {
    const rutaAbsoluta = path.join(path.dirname(RUTA_REGISTRO_FOTOS), rutaRelativa);
    const fondo = await zonaMasClara(rutaAbsoluta);
    const fondoVelado = fondo.map((canal, i) => Math.round(veloSrgb[i] * opacidad + canal * (1 - opacidad)));
    const ratio = ratioDeContraste(fondoVelado, textoSrgb);
    resultados.push({
      archivo: path.relative(RAIZ, rutaAbsoluta),
      fondo,
      fondoVelado,
      ratio,
      pasa: ratio >= UMBRAL_CONTRASTE,
    });
  }

  return { resultados, opacidad };
}

const { resultados, opacidad } = await chequearContrasteVelo();
const violaciones = resultados.filter((r) => !r.pasa);

if (violaciones.length === 0) {
  console.log(
    `OK — el velo de HeroConFoto (α=${(opacidad * 100).toFixed(0)}%) da al menos ${UMBRAL_CONTRASTE}:1 contra las ${resultados.length} fotos de cabecera declaradas en fotos-heroe.ts:`,
  );
  for (const r of resultados) {
    console.log(`  ${r.archivo}: ${r.ratio.toFixed(2)}:1`);
  }
  process.exit(0);
}

console.error(`El velo de HeroConFoto no llega a ${UMBRAL_CONTRASTE}:1 (texto normal, WCAG AA) en estas fotos:\n`);
for (const v of violaciones) {
  console.error(`  ${v.archivo}: ${v.ratio.toFixed(2)}:1 (necesita ${UMBRAL_CONTRASTE}:1)`);
  console.error(`    zona más clara sin velar: rgb(${v.fondo.join(', ')}) — velada: rgb(${v.fondoVelado.join(', ')})`);
  console.error(
    `    → Subí --velo-heroe-opacidad en packages/ui/src/styles/theme.css (y su copia documentada en docs/17-paleta-y-tokens.md), después volvé a correr este script contra TODAS las fotos del registro, no solo esta.\n`,
  );
}
process.exit(1);
