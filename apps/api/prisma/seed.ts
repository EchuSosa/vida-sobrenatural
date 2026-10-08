import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ImagenPortadaService } from '../src/storage/imagen-portada.service.js';
import { LocalStorageProvider } from '../src/storage/local-storage.provider.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Principio XI: el seed sube portadas por el MISMO camino que una subida
// real desde el backoffice (LibroService.subirPortada) — ImagenPortadaService
// + StorageService, no un archivo ni una URL escritos a mano. Si ese camino
// cambia, el seed cambia con él en vez de quedar una copia que diverge.
const RAIZ_PORTADAS = join(dirname(fileURLToPath(import.meta.url)), 'portadas');
const imagenPortadaService = new ImagenPortadaService();
const storageService = new LocalStorageProvider();

/**
 * Sube la portada de un Libro ya creado, pasándola por el mismo
 * procesamiento (redimensionar/recomprimir, sin recortar — D110 enmendada)
 * y almacenamiento que usa `POST /libros/:id/portada`. Sólo se llama si el
 * Libro todavía no tiene portada (idempotencia, ver `crearLibrosDemo`).
 */
async function sembrarPortada(libroId: string, archivo: string, portadaDescripcion: string): Promise<void> {
  const original = await readFile(join(RAIZ_PORTADAS, archivo));
  const procesada = await imagenPortadaService.procesar(original);
  const subida = await storageService.subir({
    buffer: procesada.buffer,
    nombreOriginal: archivo,
    mimeType: procesada.mimeType,
  });
  await prisma.libro.update({
    where: { id: libroId },
    data: { portadaUrl: subida.url, portadaDescripcion },
  });
}

// H-09 (revisión manual, actualización 2026-09-18): datos reales de
// docs/12-contenido-bienvenida.md / docs/09-notas-identidad-visual.md — antes
// tenía una dirección placeholder ("a confirmar") y un horario inventado
// ("10 y 18 hs") que no correspondía a ningún dato real.
const DIRECCION_REAL = 'Calle 23 N°1665 e/ 66 y 67, La Plata, Buenos Aires';
// H-23 (revisión manual, actualización 2026-09-20): el horario queda solo
// con el día y la hora — "presencial y online, por YouTube" (agregado en el
// Lote 3) da información de más acá; la transmisión online va en
// Seguinos/YouTube (todavía sin sección propia — depende de D93, spec 003).
const HORARIOS_REAL = 'Domingos 10:30 hs';

async function crearSedeDemo() {
  const existente = await prisma.sede.findFirst({ where: { activo: true } });
  if (existente) {
    // Corrige una Sede demo ya sembrada con los valores placeholder viejos,
    // sin pisar una Sede que un Admin ya haya editado a mano.
    const horariosViejos = [
      'Domingos 10 y 18 hs',
      'Domingos 10:30 hs (presencial y online, por YouTube)',
    ];
    if (existente.direccion.includes('a confirmar') || horariosViejos.includes(existente.horarios)) {
      const corregida = await prisma.sede.update({
        where: { id: existente.id },
        data: { direccion: DIRECCION_REAL, horarios: HORARIOS_REAL },
      });
      console.log(`Sede demo corregida con los datos reales: ${corregida.nombre} (${corregida.id})`);
      return corregida;
    }
    console.log(`Ya existe una Sede activa (${existente.nombre}), no se crea otra.`);
    return existente;
  }

  const sede = await prisma.sede.create({
    data: {
      nombre: 'La Plata',
      direccion: DIRECCION_REAL,
      contactoTelefono: '+54 9 221 000-0000',
      horarios: HORARIOS_REAL,
      descripcionBienvenida:
        'Bienvenido/a a Vida Sobrenatural La Plata. Nos alegra que te hayas acercado.',
      activo: true,
    },
  });

  console.log(`Sede creada: ${sede.nombre} (${sede.id})`);
  return sede;
}

/**
 * Personas de ejemplo, mínimo viable — Historia 8 (specs/002-base-transversal,
 * Clarifications): una o dos por cada estado ya definido en el spec 001, con
 * nombres genéricos en español que nunca podrían confundirse con una persona
 * real. Idempotente (por email), igual que la Sede — se puede ampliar sin
 * rehacer lo ya generado (FR-041).
 */
async function crearPersonasDemo(sedeId: string) {
  const datosComunes = {
    direccion: 'Calle 50 y 15, La Plata',
    sedeId,
    estadoCivil: 'soltero_a' as const,
    profesion: 'otro' as const,
    profesionDetalle: 'Dato de ejemplo',
    congregaDesde: 2020,
  };

  const personas: Array<Parameters<typeof prisma.persona.create>[0]['data']> = [
    {
      ...datosComunes,
      email: 'demo-activa@example.com',
      nombre: 'Ana',
      apellido: 'Ejemplo',
      genero: 'femenino',
      fechaNacimiento: new Date('1990-05-20'),
      telefono: '+54 9 221 100-0001',
      estado: 'activa',
      activo: true,
      consentimientoDatos: true,
      rol: ['miembro_registrado'],
    },
    {
      ...datosComunes,
      email: 'demo-pendiente-tutor@example.com',
      nombre: 'Juan',
      apellido: 'Demo',
      genero: 'masculino',
      fechaNacimiento: new Date('2012-03-10'),
      telefono: '+54 9 221 100-0002',
      estado: 'pendiente_tutor',
      activo: true,
      consentimientoDatos: false,
      rol: [],
    },
    {
      ...datosComunes,
      email: 'demo-inactiva@example.com',
      nombre: 'Sofía',
      apellido: 'Prueba',
      genero: 'femenino',
      fechaNacimiento: new Date('2011-08-15'),
      telefono: '+54 9 221 100-0003',
      estado: 'pendiente_tutor',
      // Caso no autorizado por el tutor — FR-014/T091 (Historia 8, Acceptance
      // Scenario 2: cubre también el estado "inactiva").
      activo: false,
      consentimientoDatos: false,
      rol: [],
    },
  ];

  for (const persona of personas) {
    const existente = await prisma.persona.findUnique({ where: { email: persona.email ?? undefined } });
    if (existente) {
      console.log(`Ya existe una Persona demo con email ${persona.email}, no se duplica.`);
      continue;
    }
    const creada = await prisma.persona.create({ data: persona });
    console.log(`Persona demo creada: ${creada.nombre} ${creada.apellido} (${creada.estado}, activo=${creada.activo})`);
  }
}

/**
 * H-12 (revisión manual, actualización 2026-09-18): sin esto, entrar al
 * backoffice exigía asignar el rol admin a mano en la base. Una Persona admin
 * de demo fija no sirve para nada acá — el login es por SSO real, nadie
 * puede autenticarse como "demo-admin@example.com". En cambio, `SEED_ADMIN_EMAIL`
 * deja que cualquiera que corra el seed se promueva a sí mismo con su propio
 * email real de Google (documentado en docs/11-setup-local.md y en los
 * quickstarts). Si la Persona ya existe (por ej. ya se había registrado),
 * solo le agrega el rol sin tocar el resto de sus datos; si no existe, la
 * crea con datos de ejemplo, igual que las demás Personas demo.
 *
 * specs/005, Historia 6 (H-141): este otorgamiento de `admin` NO se registra
 * en CambioDeRol. El motivo no es "es de desarrollo" (eso es una afirmación
 * sobre el entorno, y ya nos quemamos con eso — H-78, H-121): es que el seed
 * no es un camino de instalación de una iglesia. El camino de instalación y
 * recuperación es `db:recrear-admin` (FR-003), y ése sí se audita. Si
 * SEED_ADMIN_EMAIL alguna vez se vuelve un camino de instalación, necesita lo
 * mismo: `registrarCambioDeRol` con `{ origen: 'recuperacion_cli' }` (o un
 * origen propio).
 */
async function promoverAdminDemo(sedeId: string) {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.log('SEED_ADMIN_EMAIL no está seteada — no se crea ninguna Persona admin.');
    return;
  }

  const existente = await prisma.persona.findUnique({ where: { email } });
  if (existente) {
    if (existente.rol.includes('admin')) {
      console.log(`${email} ya tiene el rol admin.`);
      return;
    }
    await prisma.persona.update({
      where: { id: existente.id },
      data: { rol: [...existente.rol, 'admin'] },
    });
    console.log(`Rol admin agregado a la Persona existente ${email}.`);
    return;
  }

  const creada = await prisma.persona.create({
    data: {
      email,
      nombre: 'Admin',
      apellido: 'Demo',
      genero: 'femenino',
      fechaNacimiento: new Date('1990-01-01'),
      telefono: '+54 9 221 100-0000',
      direccion: 'Calle 50 y 15, La Plata',
      sedeId,
      estadoCivil: 'soltero_a',
      profesion: 'otro',
      profesionDetalle: 'Dato de ejemplo',
      congregaDesde: 2020,
      estado: 'activa',
      activo: true,
      consentimientoDatos: true,
      rol: ['admin'],
    },
  });
  console.log(`Persona admin creada: ${creada.email} (${creada.id})`);
}

/**
 * FR-031 (specs/003-contenido-institucional): la Palabra Profética vigente
 * y los 8 libros reales del catálogo de Ediciones VS, sin portada real (el
 * placeholder hace su trabajo). Año, título y video son reales — el video
 * llegó después (D121, precisa D109): confirmado 2026-09-21, ver
 * docs/12-contenido-bienvenida.md § "Palabra Profética 2026". El texto de
 * la palabra en sí todavía no llegó — lo documentado ahí es la frase
 * promocional del link-in-bio, no la palabra — así que va un texto
 * provisorio en el tono real, marcado como tal (D98): no se inventa
 * contenido institucional haciéndolo pasar por definitivo.
 */
async function crearPalabraProfeticaDemo() {
  const titulo = 'Fidelidad y crecimiento';
  const existente = await prisma.palabraProfetica.findFirst({ where: { anio: 2026, titulo } });
  if (existente) {
    console.log(`Ya existe la Palabra Profética ${existente.anio} — "${existente.titulo}", no se duplica.`);
    return existente;
  }

  const creada = await prisma.palabraProfetica.create({
    data: {
      anio: 2026,
      titulo,
      texto:
        'Este año, Dios nos habla de fidelidad y crecimiento: fidelidad en lo que ya nos confió, ' +
        'y crecimiento en lo que todavía viene. Es una invitación a sostenernos en lo que ya ' +
        'empezamos, sin apurar los tiempos de Dios, confiando en que cada paso fiel abre la puerta ' +
        'al siguiente.\n\n' +
        '(Texto provisorio — todavía no llegó el texto completo de la Palabra Profética 2026; en ' +
        'cuanto esté, se actualiza acá.)',
      youtubeUrl: 'https://www.youtube.com/watch?v=oVLmI6_IoC8',
      youtubeVideoId: 'oVLmI6_IoC8',
      vigente: true,
    },
  });
  console.log(`Palabra Profética creada: ${creada.anio} — "${creada.titulo}" (${creada.id})`);
  return creada;
}

/**
 * FR-031: los 9 libros reales de Ediciones VS, orden cronológico de
 * publicación (docs/12-contenido-bienvenida.md § Ediciones VS) — el Admin
 * puede reordenarlos después (FR-016). Idempotente por `titulo`.
 *
 * Cada uno suma su foto provisoria (`apps/api/prisma/portadas/*.jpg` — son
 * fotos de los libros, no archivos de tapa, ver el README de esa carpeta) y
 * su texto alternativo, obligatorio en cuanto hay portada (FR-025) —
 * describe la FOTO (dónde y cómo está apoyado el libro), no repite el
 * título. Idempotente por separado de la creación del Libro: si ya tiene
 * portada, no se vuelve a subir (`sembrarPortada` no se llama).
 *
 * "Vida nueva" (el último, `orden: 9`) es el único con el **año
 * inventado**: no está documentado en `docs/12-contenido-bienvenida.md`
 * como los otros ocho y no se encontró el dato real (D98 — no se inventa
 * contenido institucional haciéndolo pasar por definitivo, pero acá hace
 * falta *algún* año para el modelo y no hay forma de marcarlo "pendiente"
 * en un campo numérico). Queda anotado en `docs/12-contenido-bienvenida.md`
 * § "Datos pendientes de pedirle a la iglesia" — se corrige por el
 * backoffice el día que llegue el dato real.
 */
async function crearLibrosDemo() {
  const libros: Array<
    Parameters<typeof prisma.libro.create>[0]['data'] & { archivoPortada: string; portadaDescripcion: string }
  > = [
    {
      titulo: 'Mujer Maravilla: cuando la realidad supera a la ficción',
      autor: 'Natalia Spetale',
      anio: 2014,
      orden: 1,
      archivoPortada: 'mujer-maravilla.jpg',
      portadaDescripcion:
        'Foto del libro «Mujer Maravilla: cuando la realidad supera a la ficción» sostenido con la mano, rodeado de moños y adornos navideños.',
    },
    {
      titulo: 'El sonido en la iglesia',
      autor: 'Sebastián Arena',
      anio: 2014,
      orden: 2,
      archivoPortada: 'el-sonido-en-la-iglesia.jpg',
      portadaDescripcion: 'Foto del libro «El sonido en la iglesia» apoyado sobre el pasto.',
    },
    {
      titulo: 'Una vida en su presencia',
      autor: 'Ezequiel Rossini',
      anio: 2015,
      orden: 3,
      archivoPortada: 'una-vida-en-su-presencia.jpg',
      portadaDescripcion: 'Foto del libro «Una vida en su presencia» de pie sobre un atril negro; en su tapa, la llama de un fósforo encendido.',
    },
    {
      titulo: 'El deseo de ser tres',
      autor: 'Julieta Peralta',
      anio: 2015,
      orden: 4,
      archivoPortada: 'el-deseo-de-ser-tres.jpg',
      portadaDescripcion: 'Foto del libro «El deseo de ser tres» sostenido con la mano, con fondo interior desenfocado.',
    },
    {
      titulo: 'Antídotos contra la religión',
      autor: 'Juan Pablo Sosa',
      anio: 2016,
      orden: 5,
      archivoPortada: 'antidotos-contra-la-religion.jpg',
      portadaDescripcion: 'Foto del libro «Antídotos contra la religión» de pie, con fondo de pared texturada gris.',
    },
    {
      titulo: 'Discipulado Generacional',
      autor: 'Rosana y Marcos Oszurko',
      anio: 2018,
      orden: 6,
      archivoPortada: 'discipulado-generacional.jpg',
      portadaDescripcion: 'Foto del libro «Discipulado Generacional» apoyado en diagonal sobre una mesa de madera.',
    },
    {
      titulo: 'Hijos de la Promesa: identidad y propósito de los hijos de Dios',
      autor: 'Ezequiel Rossini',
      anio: 2019,
      orden: 7,
      archivoPortada: 'hijos-de-la-promesa.jpg',
      portadaDescripcion:
        'Foto del libro «Hijos de la Promesa: identidad y propósito de los hijos de Dios» apoyado en diagonal, con una taza y flores de fondo.',
    },
    {
      titulo: 'Diseñados para una vida saludable',
      autor: 'María José Amiunes',
      anio: 2020,
      orden: 8,
      archivoPortada: 'disenados-para-una-vida-saludable.jpg',
      portadaDescripcion: 'Foto del libro «Diseñados para una vida saludable» sostenido con la mano, al aire libre con plantas de fondo.',
    },
    {
      titulo: 'Vida nueva: una experiencia personal con Jesucristo',
      autor: 'Juan Pablo Sosa',
      anio: 2021, // PROVISORIO, INVENTADO — ver el comentario arriba de esta función.
      orden: 9,
      archivoPortada: 'vida-nueva.jpg',
      portadaDescripcion:
        'Foto del libro «Vida nueva: una experiencia personal con Jesucristo» apoyado sobre un escritorio blanco, junto a unos anteojos y una lapicera.',
    },
  ];

  for (const { archivoPortada, portadaDescripcion, ...libro } of libros) {
    let registro = await prisma.libro.findFirst({ where: { titulo: libro.titulo } });
    if (registro) {
      console.log(`Ya existe el Libro "${registro.titulo}", no se duplica.`);
    } else {
      registro = await prisma.libro.create({ data: libro });
      console.log(`Libro creado: "${registro.titulo}" (${registro.id})`);
    }

    if (registro.portadaUrl) {
      console.log(`"${registro.titulo}" ya tiene portada, no se vuelve a subir.`);
      continue;
    }
    await sembrarPortada(registro.id, archivoPortada, portadaDescripcion);
    console.log(`Portada sembrada para "${registro.titulo}".`);
  }
}

/**
 * specs/004-vida-nueva-discipulado (T009): el Curso "Vida Nueva" individual,
 * dato de referencia que la API busca por (categoria, tipo) — nunca por id
 * fijo. Idempotente. Vida Nueva Grupal (tipo `grupal`, D44) y Vida de Servicio
 * suman su registro cuando existan.
 */
async function crearCursoVidaNueva() {
  const curso = await prisma.curso.upsert({
    where: { categoria_tipo: { categoria: 'vida_nueva', tipo: 'individual' } },
    update: {},
    create: {
      nombre: 'Vida Nueva',
      categoria: 'vida_nueva',
      tipo: 'individual',
      modalidad: 'seguimiento_por_encuentros',
    },
  });
  console.log(`Curso Vida Nueva (individual) listo (${curso.id}).`);
}

/**
 * Lote 0 global (spec 008, D158): el Curso "Vida de Servicio" — grupal, con
 * liberación programada y Vida Nueva como prerrequisito (`CURSOS_RECONOCIDOS`).
 * Mismo criterio que el de arriba: se busca por (categoria, tipo).
 */
async function crearCursoVidaDeServicio() {
  const curso = await prisma.curso.upsert({
    where: { categoria_tipo: { categoria: 'vida_de_servicio', tipo: 'grupal' } },
    update: {},
    create: {
      nombre: 'Vida de Servicio',
      categoria: 'vida_de_servicio',
      tipo: 'grupal',
      modalidad: 'liberacion_programada',
      prerequisitoCategoria: 'vida_nueva',
    },
  });
  console.log(`Curso Vida de Servicio listo (${curso.id}).`);
}

async function main() {
  const sede = await crearSedeDemo();
  await crearPersonasDemo(sede.id);
  await promoverAdminDemo(sede.id);
  await crearPalabraProfeticaDemo();
  await crearLibrosDemo();
  await crearCursoVidaNueva();
  await crearCursoVidaDeServicio();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
