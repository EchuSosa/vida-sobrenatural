/**
 * H-30 (revisión manual, actualización 2026-09-20): formato acotado de
 * `horarios` — uno o más grupos "Día HH[:MM] hs", separados por ", " o
 * " y " (ej. "Domingos 10:30 hs", "Domingos 10 hs y Martes 19:30 hs").
 * Deliberadamente rechaza formas ambiguas como "Domingos 10 y 18 hs" (dos
 * horarios sin repetir el día) — cada horario nombra su propio día.
 */
const GRUPO_HORARIO = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ \\d{1,2}(?::\\d{2})? hs\\.?';
export const HORARIOS_SEDE_REGEX = new RegExp(`^${GRUPO_HORARIO}(?: y ${GRUPO_HORARIO}|, ${GRUPO_HORARIO})*$`);

/** Forma expuesta por GET /sedes, GET /sedes/:id, POST /sedes, PATCH /sedes/:id. */
export interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  horarios: string;
  descripcionBienvenida: string | null;
  /** D218: celular argentino normalizado (`549…`), o null si la Sede no lo cargó. */
  whatsappSecretaria: string | null;
  /** H-51 (revisión manual ronda 4, D117): antes no viajaba — el listado público nunca incluía inactivas. */
  activo: boolean;
  /** D119 (revisión manual ronda 6): null si no está eliminada — GET /sedes y /sedes/:id nunca devuelven una eliminada, solo GET /sedes/papelera (Admin, H-129). */
  eliminadoEn: string | null;
  /** D119: cuántas Personas tiene asociadas — decide si "Eliminar" puede ejecutarse o si hay que ofrecer inactivar en su lugar. */
  personasAsociadas: number;
}

/** Body de POST /sedes. */
export interface CrearSedeInput {
  nombre: string;
  direccion: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  horarios: string;
  descripcionBienvenida?: string;
  /** D218: como lo escribe el Admin; la API lo normaliza. Vacío = sin WhatsApp. */
  whatsappSecretaria?: string;
}

/** Body de PATCH /sedes/:id — cualquier subconjunto, más el toggle de soft delete. */
export type ActualizarSedeInput = Partial<CrearSedeInput> & { activo?: boolean };

/**
 * D218: WhatsApp de Secretaría de la Sede — un celular argentino, guardado
 * normalizado como lo pide `wa.me`: `549` + característica + número (10
 * dígitos, sin el 0 ni el 15). Acepta cómo lo escribe la gente: con o sin
 * +54, con o sin 9, con 0 y 15, con espacios, guiones o paréntesis.
 * Devuelve `null` si no es un celular argentino.
 */
export function normalizarWhatsappArgentino(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, '');
  if (digitos.length >= 12 && digitos.startsWith('54')) {
    digitos = digitos.slice(2);
    if (digitos.length === 11 && digitos.startsWith('9')) digitos = digitos.slice(1);
  }
  if (digitos.startsWith('0')) digitos = digitos.slice(1);
  if (digitos.length === 12) {
    // El 15 va después de la característica, que tiene 2, 3 o 4 dígitos.
    for (const largo of [2, 3, 4]) {
      if (digitos.slice(largo, largo + 2) === '15') {
        digitos = digitos.slice(0, largo) + digitos.slice(largo + 2);
        break;
      }
    }
  }
  // Las características argentinas empiezan con 1, 2 o 3 (0800/0810 no son celulares).
  if (!/^[123]\d{9}$/.test(digitos)) return null;
  return `549${digitos}`;
}

/** D218: enlace para abrir el chat (`https://wa.me/549…`). */
export function enlaceWhatsapp(normalizado: string): string {
  return `https://wa.me/${normalizado}`;
}

/**
 * D218: el número normalizado, legible ("+54 9 221 555-0101"). La
 * característica se asume de 2 dígitos para el 11 y de 3 para el resto: es
 * solo para mostrar, el enlace usa el número entero.
 */
export function formatearWhatsappArgentino(normalizado: string): string {
  const nacional = normalizado.replace(/^549/, '');
  const largo = nacional.startsWith('11') ? 2 : 3;
  const caracteristica = nacional.slice(0, largo);
  const numero = nacional.slice(largo);
  return `+54 9 ${caracteristica} ${numero.slice(0, numero.length - 4)}-${numero.slice(-4)}`;
}
