import { apiFetch, type Sede } from '@vida-sobrenatural/shared-types';
import { FormularioRegistro } from './formulario-registro';

/**
 * H-60/H-43 (revisión manual ronda 7): el resto de esta pantalla se queda
 * de cliente a propósito — punto 5. `RegistroPage` (FormularioRegistro,
 * H-44: 663 líneas, refactor deliberadamente pospuesto) depende de la
 * sesión en vivo (redirige apenas `session.user.estado` cambia a `activa`
 * tras `update()`, sin esperar un login nuevo — H-19) y de un estado de
 * formulario de cuatro pasos con validación entre ellos: nada de eso es un
 * fetch, es interacción real que no tiene sentido en el servidor. Lo único
 * que SÍ era un simple fetch-y-listo era la lista de Sedes del paso 2 — esa
 * parte se muda acá.
 *
 * Si GET /sedes falla, no se corta el registro entero con un error.tsx: los
 * pasos 1 y 3 no necesitan la Sede, así que se sigue mostrando el
 * formulario con la lista vacía y un aviso — mismo criterio que ya tenía
 * esta pantalla (degradado, no bloqueante).
 */
export default async function RegistroPage() {
  // spec 007 (T024): sin sesión, `layout.tsx` ya llevó a /ingresar.
  let sedes: Sede[] = [];
  let errorSedes = false;
  try {
    sedes = await apiFetch<Sede[]>('/sedes');
  } catch {
    errorSedes = true;
  }

  return <FormularioRegistro sedesIniciales={sedes} errorSedes={errorSedes} />;
}
