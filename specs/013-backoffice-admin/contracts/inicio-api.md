# Contrato: Inicio, métricas y cumpleaños

## `GET /inicio/metricas`

Permiso: `inicio.ver`. Respuesta `200 Metricas`:

```ts
{
  personasActivas: number;
  porTiempoCongregacion: { valor: TiempoCongregacion; cantidad: number }[]; // los 5, en ORDEN_TIEMPO_CONGREGACION
  porSede: { sedeId: string; nombre: string; activa: boolean; cantidad: number }[]; // Sedes no eliminadas, por nombre
}
```

## `GET /personas/cumpleanos?mes=1..12&skip&take`

Permiso: `personas.ver`. `mes` por defecto el actual (`hoyEnArgentina`). Respuesta `Pagina<Cumpleanero>`:

```ts
interface Cumpleanero {
  persona: PersonaBreve; dia: number;      // día en que se festeja ESE año (29/2 → 28 en no bisiesto)
  cumple: number; esHoy: boolean; telefono: string;
}
```

Orden: `dia`, `apellido`, `nombre`. `400 VALIDACION` si `mes` no es 1..12 (la pantalla redirige antes).

## `GET /inicio/cumpleanos-semana`

Permiso: `inicio.ver`. Respuesta `Cumpleanero[]` de hoy a hoy + 7 (incluye `fecha: 'YYYY-MM-DD'`), ordenados por
fecha. Sin paginar: acotado por 8 días (si superara 50, devuelve 50 y `hayMas: true` — el bloque enlaza al mes).

## Pendientes

`GET /solicitudes/conteo-abiertas` (bandeja), `GET /discipulado/pendientes-admin` (004, sin cambios) y el total de
`GET /personas/pendientes-tutor?take=1` (existente) para la línea de Pendientes de tutor.
