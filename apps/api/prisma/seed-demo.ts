import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type {
  EstadoCivil,
  Genero,
  Profesion,
} from '../src/generated/prisma/enums.js';

/**
 * D120: `db:seed` (prisma/seed.ts) queda como el mínimo indispensable para
 * que la app arranque y para los tests — rápido, determinista, sin volumen.
 * Este script corre ENCIMA de ese mínimo (no lo reemplaza) y agrega los
 * datos de demostración: volumen realista + escenarios armados a mano +
 * datos hostiles a propósito, para poder ver cómo se comportan las
 * pantallas del backoffice con algo parecido a datos reales.
 *
 * Emails con prefijo `demo-` — el prefijo `e2e-` es el que borra
 * `limpiar-e2e` (H-67); estos datos son para mirar a mano, no se borran
 * solos.
 *
 * Idempotente: cada Sede y cada Persona se identifica por un dato único
 * (nombre de Sede, email de Persona) — si ya existe, se saltea sin
 * duplicar ni pisar lo que un Admin haya podido editar a mano.
 */

// Lote 0 global: una parte por spec, cada una en su archivo (specs/IMPLEMENTACION.md).
import { sembrarDemo006 } from './seed-demo/006-camino.js';
import { sembrarDemo007 } from './seed-demo/007-ingreso.js';
import { sembrarDemo008 } from './seed-demo/008-vida-de-servicio.js';
import { sembrarDemo009 } from './seed-demo/009-ministerios.js';
import { sembrarDemo010 } from './seed-demo/010-bautismo.js';
import { sembrarDemo011 } from './seed-demo/011-eventos.js';
import { sembrarDemo012 } from './seed-demo/012-avisos.js';
import { sembrarDemo013 } from './seed-demo/013-backoffice.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// --- Datos base para generar nombres verosímiles --------------------------

const NOMBRES_MASCULINOS = [
  'Juan', 'Carlos', 'José', 'Miguel', 'Jorge', 'Luis', 'Martín', 'Diego',
  'Pablo', 'Sergio', 'Fernando', 'Alberto', 'Roberto', 'Ricardo', 'Daniel',
  'Gustavo', 'Mariano', 'Facundo', 'Nicolás', 'Matías', 'Federico', 'Ezequiel',
  'Ignacio', 'Agustín', 'Leandro', 'Emanuel', 'Rodrigo', 'Alejandro', 'Hernán',
  'Maximiliano',
];

const NOMBRES_FEMENINOS = [
  'María', 'Ana', 'Laura', 'Claudia', 'Silvia', 'Patricia', 'Marcela',
  'Andrea', 'Valeria', 'Florencia', 'Carolina', 'Gabriela', 'Verónica',
  'Cecilia', 'Lucía', 'Sofía', 'Camila', 'Julieta', 'Micaela', 'Agustina',
  'Antonella', 'Rocío', 'Daniela', 'Paula', 'Natalia', 'Mariana', 'Belén',
  'Carla', 'Ivana', 'Brenda',
];

// Con tildes y ñ a propósito — son apellidos reales y comunes, no un caso
// aparte: la mayoría de los apellidos argentinos ya los tiene.
const APELLIDOS = [
  'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'García',
  'Pérez', 'Sánchez', 'Romero', 'Sosa', 'Torres', 'Álvarez', 'Ruiz',
  'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Aguirre',
  'Domínguez', 'Molina', 'Núñez', 'Giménez', 'Ortiz', 'Peña', 'Cabrera',
  'Ledesma', 'Ibáñez', 'Villalba', 'Coronel', 'Arias', 'Vega', 'Godoy',
  'Maldonado', 'Bustos', 'Quiroga', 'Paz', 'Escobar', 'Vera',
];

const PROFESIONES: Profesion[] = [
  'salud', 'educacion', 'tecnologia_ingenieria', 'comercio_ventas',
  'oficios_construccion', 'administracion_finanzas', 'legal',
  'comunicacion_marketing', 'arte_diseno', 'servicios_gastronomia',
  'transporte', 'estudiante', 'ama_de_casa', 'jubilado_a', 'sin_ocupacion',
  'otro',
];

const ESTADOS_CIVILES: EstadoCivil[] = [
  'soltero_a', 'casado_a', 'en_concubinato', 'viudo_a', 'divorciado_a', 'separado_a',
];

// D214: año en que empezó a venir — repartidos para que la métrica de la 013
// tenga Personas en los cuatro rangos (este año, 1–2, 3–5, más de 5).
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS_CONGREGA_DESDE: number[] = [ANIO_ACTUAL, ANIO_ACTUAL - 1, ANIO_ACTUAL - 2, ANIO_ACTUAL - 4, ANIO_ACTUAL - 9, 1998];

function elegir<T>(lista: T[], indice: number): T {
  return lista[indice % lista.length];
}

/** Fecha determinística a partir de "hoy menos N días" — sin Math.random() para que el script sea reproducible. */
function hace(dias: number): Date {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha;
}

function fechaNacimientoConEdad(edad: number, corrimientoDias: number): Date {
  const fecha = hace(edad * 365 + corrimientoDias);
  return fecha;
}

// --- Sedes ------------------------------------------------------------------

/**
 * Además de la Sede real (La Plata, ya creada por `db:seed`), agrega dos
 * más para poder repartir el volumen — y las dos escenarios que pide D120:
 * una Sede inactiva y una eliminada (papelera, D119). Ninguna Sede acá
 * reemplaza a La Plata ni toca sus datos.
 */
async function crearSedesDemo() {
  const laPlata = await prisma.sede.findFirst({ where: { nombre: 'La Plata', eliminadoEn: null } });
  if (!laPlata) {
    throw new Error('No existe la Sede "La Plata" — corré `pnpm --filter api run db:seed` primero.');
  }

  const buenosAiresExistente = await prisma.sede.findFirst({ where: { nombre: 'Buenos Aires' } });
  const buenosAires =
    buenosAiresExistente ??
    (await prisma.sede.create({
      data: {
        nombre: 'Buenos Aires',
        direccion: 'Av. Corrientes 1234, CABA',
        contactoTelefono: '+54 9 11 4000-0001',
        horarios: 'Domingos 11 hs',
        descripcionBienvenida: 'Bienvenido/a a Vida Sobrenatural Buenos Aires.',
        activo: true,
      },
    }));

  // Escenario D120: una Sede inactiva (no eliminada) — sigue existiendo,
  // solo no acepta más actividad nueva.
  const rosarioExistente = await prisma.sede.findFirst({ where: { nombre: 'Rosario (demo, inactiva)' } });
  const rosario =
    rosarioExistente ??
    (await prisma.sede.create({
      data: {
        nombre: 'Rosario (demo, inactiva)',
        direccion: 'San Martín 567, Rosario, Santa Fe',
        contactoTelefono: '+54 9 341 500-0002',
        horarios: 'Domingos 10 hs',
        descripcionBienvenida: 'Bienvenido/a a Vida Sobrenatural Rosario.',
        activo: false,
      },
    }));

  // Escenario D120: una Sede eliminada (papelera, D119) — sin Personas
  // asociadas, igual que exige la regla real de "Eliminar" en la app.
  const cordobaExistente = await prisma.sede.findFirst({ where: { nombre: 'Córdoba (demo, papelera)' } });
  const cordoba =
    cordobaExistente ??
    (await prisma.sede.create({
      data: {
        nombre: 'Córdoba (demo, papelera)',
        direccion: 'Av. Colón 890, Córdoba',
        contactoTelefono: '+54 9 351 600-0003',
        horarios: 'Domingos 10:30 hs',
        activo: true,
        eliminadoEn: hace(10),
      },
    }));

  console.log(`Sedes demo listas: ${laPlata.nombre}, ${buenosAires.nombre}, ${rosario.nombre}, ${cordoba.nombre} (eliminada).`);
  return { laPlata, buenosAires, rosario, cordoba };
}

// --- Volumen: ~200 Personas verosímiles --------------------------------------

const CANTIDAD_BULK = 200;

/**
 * Reparte edades y estados como los produciría el registro real
 * (`EstadoPersona`/`calcularEdad`, `persona.service.ts`): menor de 18 →
 * `pendiente_tutor`; 18 o más → `activa`. Uno de cada ~7 es menor, para que
 * la lista de Pendientes de tutor tenga volumen propio sin ser la mayoría.
 */
async function crearPersonasVolumenDemo(sedeIds: { laPlata: string; buenosAires: string; rosario: string }) {
  const { laPlata, buenosAires, rosario } = sedeIds;
  const sedesActivas = [laPlata, buenosAires, laPlata, buenosAires, rosario];

  for (let i = 0; i < CANTIDAD_BULK; i++) {
    const email = `demo-persona-${String(i + 1).padStart(3, '0')}@example.com`;
    const existente = await prisma.persona.findUnique({ where: { email } });
    if (existente) continue;

    const esMujer = i % 2 === 0;
    const genero: Genero = esMujer ? 'femenino' : 'masculino';
    const nombre = esMujer ? elegir(NOMBRES_FEMENINOS, i) : elegir(NOMBRES_MASCULINOS, i);
    const apellido = elegir(APELLIDOS, Math.floor(i / 3));
    const sedeId = elegir(sedesActivas, i);

    const esMenor = i % 7 === 0;
    const edad = esMenor ? 1 + (i % 17) : 18 + (i % 58);
    const fechaNacimiento = fechaNacimientoConEdad(edad, i % 365);
    const createdAt = hace(i % 730);

    const areaCode = sedeId === sedeIds.buenosAires ? '11' : sedeId === sedeIds.rosario ? '341' : '221';
    const telefono = `+54 9 ${areaCode} ${String(400 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`;

    const profesion = elegir(PROFESIONES, i);

    await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido,
        genero,
        fechaNacimiento,
        telefono,
        direccion: `Calle ${10 + (i % 90)} N°${100 + i}, ${sedeId === sedeIds.buenosAires ? 'CABA' : sedeId === sedeIds.rosario ? 'Rosario' : 'La Plata'}`,
        sedeId,
        estadoCivil: elegir(ESTADOS_CIVILES, i),
        profesion,
        profesionDetalle: profesion === 'otro' ? 'Oficio de ejemplo' : undefined,
        congregaDesde: elegir(ANIOS_CONGREGA_DESDE, i),
        estado: esMenor ? 'pendiente_tutor' : 'activa',
        // Una de cada ~11 Personas pendientes queda no autorizada (activo
        // false) — mismo caso que ya cubre el seed mínimo, con volumen.
        activo: esMenor ? i % 11 !== 0 : true,
        consentimientoDatos: !esMenor,
        rol: esMenor ? [] : ['miembro_registrado'],
        createdAt,
      },
    });
  }

  console.log(`${CANTIDAD_BULK} Personas demo de volumen listas (o ya existentes).`);
}

// --- Escenarios armados a mano (D99) -----------------------------------------

/**
 * Los dos caminos de "Activar" (D108): un menor pendiente cuyo tutor ya
 * está registrado y se puede encontrar por búsqueda, y otro cuyo tutor no
 * está registrado — hay que cargarlo a mano. Apellido "Zabala Quintero" a
 * propósito: no está en el pool de apellidos del volumen, así que la
 * búsqueda del tutor encontrable no compite con otras 200 filas.
 */
async function crearEscenarioTutores(sedeId: string) {
  const tutorEmail = 'demo-tutor-encontrable@example.com';
  const tutorExistente = await prisma.persona.findUnique({ where: { email: tutorEmail } });
  if (!tutorExistente) {
    await prisma.persona.create({
      data: {
        email: tutorEmail,
        nombre: 'Marcela',
        apellido: 'Zabala Quintero',
        genero: 'femenino',
        fechaNacimiento: fechaNacimientoConEdad(42, 0),
        telefono: '+54 9 221 700-0001',
        direccion: 'Calle 47 N°650, La Plata',
        sedeId,
        estadoCivil: 'casado_a',
        profesion: 'salud',
        congregaDesde: 2020,
        estado: 'activa',
        activo: true,
        consentimientoDatos: true,
        rol: ['miembro_registrado'],
      },
    });
  }

  const menorConTutorEmail = 'demo-menor-tutor-encontrable@example.com';
  const menorConTutorExistente = await prisma.persona.findUnique({ where: { email: menorConTutorEmail } });
  if (!menorConTutorExistente) {
    await prisma.persona.create({
      data: {
        email: menorConTutorEmail,
        nombre: 'Tomás',
        apellido: 'Zabala Quintero',
        genero: 'masculino',
        fechaNacimiento: fechaNacimientoConEdad(15, 0),
        telefono: '+54 9 221 700-0002',
        direccion: 'Calle 47 N°650, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'estudiante',
        congregaDesde: 2020,
        estado: 'pendiente_tutor',
        activo: true,
        consentimientoDatos: false,
        rol: [],
      },
    });
  }

  const menorSinTutorEmail = 'demo-menor-tutor-manual@example.com';
  const menorSinTutorExistente = await prisma.persona.findUnique({ where: { email: menorSinTutorEmail } });
  if (!menorSinTutorExistente) {
    await prisma.persona.create({
      data: {
        email: menorSinTutorEmail,
        nombre: 'Abril',
        apellido: 'Yagüe Cardozo',
        genero: 'femenino',
        fechaNacimiento: fechaNacimientoConEdad(16, 0),
        telefono: '+54 9 221 700-0003',
        direccion: 'Calle 8 N°1200, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'estudiante',
        congregaDesde: 2020,
        estado: 'pendiente_tutor',
        activo: true,
        consentimientoDatos: false,
        rol: [],
      },
    });
  }

  console.log('Escenario de tutores (encontrable / a mano) listo.');
}

/**
 * Datos hostiles a propósito (D120) — uno por trait, no combinados, para
 * poder señalar exactamente cuál rompe una pantalla si rompe algo. No hay
 * un límite de longitud definido en el código (sin `@MaxLength` en los DTO
 * ni `maxLength` en los campos del frontend, revisado antes de escribir
 * esto) — "el límite de cada campo" se aproxima con texto largo real, no
 * con un número exacto que no existe todavía.
 */
async function crearPersonasHostiles(sedeId: string) {
  const datosComunes = {
    sedeId,
    estadoCivil: 'soltero_a' as const,
    profesion: 'otro' as const,
    profesionDetalle: 'Dato de ejemplo',
    congregaDesde: 2020,
    fechaNacimiento: fechaNacimientoConEdad(35, 0),
    genero: 'femenino' as const,
    estado: 'activa' as const,
    activo: true,
    consentimientoDatos: true,
    rol: ['miembro_registrado'] as const,
  };

  const hostiles: Array<{ email: string; data: Record<string, unknown> }> = [
    {
      email: 'demo-nombre-largo@example.com',
      data: {
        ...datosComunes,
        // Cuatro nombres de pila — Argentina no limita la cantidad por ley,
        // y combinaciones así (con "de los"/"del") son reales.
        nombre: 'María de los Ángeles del Rosario',
        apellido: 'Fernández',
        telefono: '+54 9 221 800-0001',
        direccion: 'Calle 1 y 50, La Plata',
      },
    },
    {
      email: 'demo-apellido-compuesto@example.com',
      data: {
        ...datosComunes,
        nombre: 'Juan',
        apellido: 'Rodríguez Pérez de la Fuente',
        telefono: '+54 9 221 800-0002',
        direccion: 'Calle 3 y 44, La Plata',
        genero: 'masculino',
      },
    },
    {
      email: 'demo-tildes-n@example.com',
      data: {
        ...datosComunes,
        nombre: 'Ñoño José María',
        apellido: 'Muñoz Peña Núñez',
        telefono: '+54 9 221 800-0003',
        direccion: 'Diagonal 74 N°233, entre 2 y 3, La Plata',
      },
    },
    {
      email: 'demo-sin-telefono@example.com',
      data: {
        ...datosComunes,
        nombre: 'Rosa',
        apellido: 'Aquino',
        // A propósito: no tiene teléfono cargado — caso real (D90 lo pide
        // en el registro, pero el resto de las altas — Admin, importación
        // futura — podrían no tenerlo).
        telefono: '',
        direccion: 'Calle 60 N°310, La Plata',
      },
    },
    {
      email: 'demo-direccion-dos-lineas@example.com',
      data: {
        ...datosComunes,
        nombre: 'Beatriz',
        apellido: 'Coronel',
        telefono: '+54 9 221 800-0005',
        direccion: 'Calle 13 N°855, 3er piso depto "B"\nEntre Diagonal 80 y calle 71, La Plata',
      },
    },
    {
      email: 'demo-texto-limite@example.com',
      data: {
        ...datosComunes,
        nombre: 'Esteban',
        apellido: 'Bustos',
        telefono: '+54 9 221 800-0006',
        direccion: 'Calle 45 N°777, La Plata',
        genero: 'masculino',
        // Sin límite definido en el código — texto largo real (no relleno
        // repetido) para estresar el layout de todas formas.
        profesionDetalle:
          'Técnico electromecánico especializado en mantenimiento industrial, con orientación en automatización de líneas de producción y sistemas neumáticos e hidráulicos, además de tareas ocasionales de soldadura y electricidad domiciliaria los fines de semana',
      },
    },
  ];

  for (const { email, data } of hostiles) {
    const existente = await prisma.persona.findUnique({ where: { email } });
    if (existente) continue;
    await prisma.persona.create({ data: { email, ...data } as Parameters<typeof prisma.persona.create>[0]['data'] });
  }

  console.log('Personas demo con datos hostiles listas (o ya existentes).');
}

/**
 * FR-032/D120 (specs/003-contenido-institucional): tres Libros hostiles a
 * propósito, sumados a los 8 reales de `seed.ts` (este script corre
 * ENCIMA de ese mínimo, no lo reemplaza — D120). Idempotente por `titulo`,
 * mismo criterio que el resto de este script (un dato único por registro).
 */
async function crearLibrosHostiles() {
  const hostiles: Array<Parameters<typeof prisma.libro.create>[0]['data']> = [
    {
      // Sin límite corto definido en el modelo (Edge Case del spec) — un
      // título larguísimo real, no relleno repetido, para verificar que no
      // rompe el layout del listado ni desborda en celular.
      titulo:
        'Antídotos contra la religión: una guía práctica para reconocer, entender y dejar atrás las estructuras religiosas que se disfrazan de fe genuina, con testimonios reales de quienes ya hicieron ese camino',
      autor: 'Juan Pablo Sosa (edición ampliada)',
      anio: 2016,
      orden: 100,
    },
    {
      titulo: 'Vida de Servicio: acompañamiento pastoral',
      // Tildes y ñ — Edge Case explícito del spec.
      autor: 'Ñañez Bermúdez, María José',
      anio: 2021,
      orden: 101,
    },
    {
      titulo: 'Discipulado en tiempos de crisis',
      autor: 'Equipo Pastoral VS',
      anio: 2022,
      orden: 102,
      // Sin descripción — dato hostil a propósito (FR-032).
    },
  ];

  for (const libro of hostiles) {
    const existente = await prisma.libro.findFirst({ where: { titulo: libro.titulo } });
    if (existente) {
      console.log(`Ya existe el Libro hostil "${existente.titulo}", no se duplica.`);
      continue;
    }
    const creado = await prisma.libro.create({ data: libro });
    console.log(`Libro hostil creado: "${creado.titulo}" (${creado.id})`);
  }
}

async function main() {
  const sedes = await crearSedesDemo();
  await crearPersonasVolumenDemo({
    laPlata: sedes.laPlata.id,
    buenosAires: sedes.buenosAires.id,
    rosario: sedes.rosario.id,
  });
  await crearEscenarioTutores(sedes.laPlata.id);
  await crearPersonasHostiles(sedes.laPlata.id);
  await crearLibrosHostiles();

  const ctx = { prisma, sedes: { laPlata: sedes.laPlata.id, buenosAires: sedes.buenosAires.id, rosario: sedes.rosario.id } };
  await sembrarDemo006(ctx);
  await sembrarDemo007(ctx);
  await sembrarDemo008(ctx);
  await sembrarDemo009(ctx);
  await sembrarDemo010(ctx);
  await sembrarDemo011(ctx);
  await sembrarDemo012(ctx);
  await sembrarDemo013(ctx);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
