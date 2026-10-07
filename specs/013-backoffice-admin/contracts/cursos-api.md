# Contrato: Cursos

Mismo patrón que Sedes (D117, D119).

| Método y ruta | Permiso | Notas |
|---|---|---|
| `GET /cursos?incluirInactivos=true` | `catalogos.ver` | `CursoListado[]` (pocos registros, sin paginar — `docs/15`: no en catálogos de pocas filas); excluye eliminados |
| `GET /cursos/:id` | `catalogos.ver` | `CursoDetalle`; `404` si eliminado |
| `GET /cursos/disponibles-para-alta` | `cursos.gestionar` | combinaciones de `CURSOS_RECONOCIDOS` sin registro (o eliminadas → `restaurar: true`) |
| `POST /cursos` | `cursos.gestionar` | `{ categoria, tipo, nombre, descripcion? }`; `409 CURSO_YA_EXISTE`, `400 CURSO_NO_RECONOCIDO` |
| `PATCH /cursos/:id` | `cursos.gestionar` | `{ nombre?, descripcion?, activo? }` — categoria/tipo/modalidad no se aceptan (`400 VALIDACION`) |
| `DELETE /cursos/:id` | `cursos.gestionar` | soft delete (`eliminadoEn/Por`); `409 CURSO_TIENE_GRUPOS` |
| `GET /cursos/papelera` | `cursos.papelera.ver` | eliminados |
| `POST /cursos/:id/restaurar` | `cursos.gestionar` | |

```ts
interface CursoListado {
  id: string; nombre: string; categoria: CategoriaCurso; tipo: TipoCurso; modalidad: ModalidadCurso;
  activo: boolean; gruposEnCurso: number; tieneGrupos: boolean; // tieneGrupos decide "Eliminar" deshabilitado
}
interface CursoDetalle extends CursoListado { descripcion: string | null; createdAt: string; updatedAt: string }
```

Inactivar con `gruposEnCurso > 0`: la API no exige nada extra (la confirmación reforzada es de interfaz, D38); el
efecto es `CURSO_INACTIVO` al crear Grupos (research #12).

`GET /catalogos/resumen` (`catalogos.ver`): `{ sedes: { activos, total }, cursos: { activos, total } }` — la 009 suma
`ministerios` y `celulas`.
