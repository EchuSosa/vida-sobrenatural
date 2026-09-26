'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { stripVTControlCharacters } = require('node:util');

/**
 * H-146: una corrida de la suite de integración falló 14 de 73 y no quedó
 * rastro — no se supo CUÁLES, que es casi todo el diagnóstico (¿las 14 del
 * mismo archivo? ¿repartidas y todas tocan la base?). Este reporter hace que
 * la próxima aparición sea evidencia y no un recuerdo: declarado en
 * jest-e2e.config.cjs, corre SIEMPRE, se lance la suite como se lance.
 *
 * Escribe un JSON por corrida, con la fecha en el nombre — una corrida que
 * falla no la pisa la siguiente, que es exactamente lo que pasó —, más
 * `ultima.json`. Nunca borra nada (ninguna operación destructiva más en las
 * suites, H-130); `test-results/` está en .gitignore. En CI el job lo sube
 * como artefacto aunque falle (.github/workflows/ci.yml).
 */
class ReporterAArchivo {
  constructor(globalConfig, opciones = {}) {
    this.directorio = path.resolve(globalConfig.rootDir, opciones.directorio ?? 'test-results/integracion');
  }

  onRunStart() {
    this.inicio = new Date();
  }

  onRunComplete(_contextos, resultados) {
    const fin = new Date();
    const sinColor = (texto) => stripVTControlCharacters(String(texto ?? ''));
    const recortar = (texto) => sinColor(texto).split('\n').slice(0, 25).join('\n');
    const relativo = (archivo) => path.relative(path.resolve(this.directorio, '..', '..'), archivo);

    const tests = [];
    const fallas = [];
    const suitesConError = [];
    for (const suite of resultados.testResults) {
      if (suite.testExecError || suite.failureMessage && suite.numFailingTests === 0) {
        suitesConError.push({ archivo: relativo(suite.testFilePath), mensaje: recortar(suite.testExecError?.message ?? suite.failureMessage) });
      }
      for (const t of suite.testResults) {
        tests.push({ archivo: relativo(suite.testFilePath), nombre: t.fullName, estado: t.status, duracionMs: t.duration });
        if (t.status === 'failed') {
          fallas.push({ archivo: relativo(suite.testFilePath), nombre: t.fullName, mensaje: recortar(t.failureMessages.join('\n')) });
        }
      }
    }

    const informe = {
      inicio: this.inicio?.toISOString(),
      fin: fin.toISOString(),
      commit: this.commit(),
      entorno: {
        node: process.version,
        // Solo el NOMBRE de la base (verificada por H-130), nunca la URL con credenciales.
        baseDeDatos: this.nombreDeBase(process.env.DATABASE_URL),
        ci: Boolean(process.env.CI),
      },
      totales: {
        tests: resultados.numTotalTests,
        pasados: resultados.numPassedTests,
        fallados: resultados.numFailedTests,
        suites: resultados.numTotalTestSuites,
        suitesFalladas: resultados.numFailedTestSuites,
        suitesConErrorDeEjecucion: resultados.numRuntimeErrorTestSuites,
      },
      fallas,
      suitesConError,
      tests,
    };

    fs.mkdirSync(this.directorio, { recursive: true });
    const sello = fin.toISOString().replace(/[:.]/g, '-');
    const archivo = path.join(this.directorio, `corrida-${sello}.json`);
    const contenido = `${JSON.stringify(informe, null, 2)}\n`;
    fs.writeFileSync(archivo, contenido);
    fs.writeFileSync(path.join(this.directorio, 'ultima.json'), contenido);
    const sinCorrer = suitesConError.length ? `, y ${suitesConError.length} archivo(s) que no llegaron a correr` : '';
    console.log(
      `\n[reporter-a-archivo] ${informe.totales.fallados} fallas de ${informe.totales.tests} tests${sinCorrer} — informe: ${path.relative(process.cwd(), archivo)}`,
    );
  }

  commit() {
    try {
      return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return null;
    }
  }

  nombreDeBase(url) {
    try {
      return new URL(url).pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }
}

module.exports = ReporterAArchivo;
