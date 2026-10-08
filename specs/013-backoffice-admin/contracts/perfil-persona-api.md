# Contrato: Perfil de Persona

## `GET /personas/:id/perfil`

Permiso: `personas.ver` (Admin, Pastor — D64 incluye contacto). `404 NO_ENCONTRADO` si no existe.

```ts
interface PerfilPersona {
  id: string; nombre: string; apellido: string; fotoUrl: string | null;
  fechaNacimiento: string; edad: number; genero: Genero; estadoCivil: EstadoCivil;
  profesion: Profesion; profesionDetalle: string | null;
  telefono: string; direccion: string; email: string | null;
  sede: { id: string; nombre: string; activa: boolean };
  congregaDesde: number;           // año (D214); la pantalla muestra "desde 2019 (hace 7 años)"
  estado: EstadoPersona; activo: boolean;           // activo = false → "Dada de baja"
  usaLaApp: boolean;                                 // tiene email vinculable (D97, D145)
  origenAlta: OrigenAlta; altaPor: PersonaBreve | null;
  consentimiento: { fecha: string; origen: OrigenConsentimiento };
  tutor: { nombre: string; apellido: string; telefono: string } | null; // solo menores
  roles: { deCargo: RolDeCargo[]; delProceso: string[] };
  relaciones: RelacionFamiliarVista[];               // las dos direcciones (D112)
  createdAt: string;
}
interface RelacionFamiliarVista {
  familiar: PersonaBreve;
  relacion: RelacionDesde; // 'tutor_de' | 'a_cargo_de' | 'conyuge' | 'hijo_a' | 'padre_madre' | 'hermano_a'
}
```

Nunca devuelve notas de Encuentros, motivos de declinación ni campos técnicos (`adminSembrado`, preferencias).

## `GET /personas/:id/grupos`

Permiso: `personas.ver`. Respuesta:

```ts
{ cursados: GrupoEnPerfil[]; aCargo: GrupoEnPerfil[]; totalCursados: number; totalACargo: number }
interface GrupoEnPerfil {
  grupoId: string; curso: { nombre: string; categoria: CategoriaCurso; tipo: TipoCurso };
  estadoGrupo: EstadoGrupo; estadoInscripcion?: EstadoInscripcion; // solo en cursados
  desde: string; hasta: string | null;
}
```

20 más recientes por lista (`take` ≤ 50).

## Historial de Solicitudes

`GET /solicitudes?persona=:id&filtro=todas&orden=fecha&dir=desc&take=20` (contrato de la bandeja).

## `PATCH /personas/:id` (Historia 7)

Permiso: `personas.editar` (Admin). Body: subconjunto de los campos del alta (006), todos opcionales. Respuesta
`200 PerfilPersona`. Errores: `400 VALIDACION` (por campo), `409 EMAIL_DUPLICADO`,
`409 PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO`, `404 NO_ENCONTRADO`, `403 SIN_PERMISO`.
