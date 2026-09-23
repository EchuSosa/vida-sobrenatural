#!/usr/bin/env node
/**
 * H-117 (revisión manual): docs/05-decisiones.md lo escriben sesiones
 * distintas en paralelo (claude.ai y Claude Code) — nada impedía que dos
 * tomaran el mismo número de decisión. Ya pasó: D128 lo usó Claude Code
 * para la enmienda de D124, y esta sesión escribió otro D128 encima; quedó
 * corregido a mano como D129. Este chequeo es mecánico, no depende de que
 * alguien se acuerde de revisar el último número usado antes de escribir
 * uno nuevo (la regla de "mirá el último número" en CLAUDE.md sigue
 * valiendo — esto es la red, no el reemplazo).
 *
 * Parsea la primera columna de cada fila de la tabla (`| D<n> | ... |`) y
 * falla si algún número aparece más de una vez. Uso:
 *   node scripts/chequear-decisiones-duplicadas.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUTA_DECISIONES = path.join(__dirname, '..', 'docs', '05-decisiones.md');

/** Solo filas de la tabla: empiezan con `| D<dígitos> |` (el separador `|---|---|---|` no matchea, no tiene dígitos). */
const FILA_DECISION = /^\|\s*D(\d+)\s*\|/;

function chequearDecisionesDuplicadas(rutaArchivo) {
  const contenido = readFileSync(rutaArchivo, 'utf-8');
  const lineas = contenido.split('\n');

  /** @type {Map<number, number[]>} número de decisión -> líneas (1-indexed) donde aparece */
  const apariciones = new Map();

  lineas.forEach((linea, indice) => {
    const match = FILA_DECISION.exec(linea);
    if (!match) return;
    const numero = Number(match[1]);
    const lineasPrevias = apariciones.get(numero) ?? [];
    lineasPrevias.push(indice + 1);
    apariciones.set(numero, lineasPrevias);
  });

  const duplicados = [...apariciones.entries()]
    .filter(([, lineasDeEsteNumero]) => lineasDeEsteNumero.length > 1)
    .sort(([a], [b]) => a - b);

  if (duplicados.length === 0) {
    console.log(`OK — ${apariciones.size} decisiones, ningún número repetido.`);
    return 0;
  }

  console.error('Números de decisión repetidos en docs/05-decisiones.md:\n');
  for (const [numero, lineasDeEsteNumero] of duplicados) {
    console.error(`  D${numero}: líneas ${lineasDeEsteNumero.join(', ')}`);
  }
  console.error(
    '\nRenombrá una de las dos (el siguiente número libre) y revisá que no se pisen el contenido.',
  );
  return 1;
}

process.exit(chequearDecisionesDuplicadas(RUTA_DECISIONES));
