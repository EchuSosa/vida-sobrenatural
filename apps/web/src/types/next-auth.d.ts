import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    // Provistos por el profile() custom de Google (given_name/family_name) —
    // ver auth.ts. `image` (picture) ya es un campo estándar de next-auth.
    givenName?: string | null;
    familyName?: string | null;
    // Actualización 2026-09-17 (FR-017) — email_verified del proveedor SSO,
    // usado en el callback signIn antes de vincular o crear una Persona.
    emailVerificadoPorProveedor?: boolean;
  }

  interface Session {
    user: DefaultSession['user'] & {
      personaId: string | null;
      estado: 'activa' | 'pendiente_tutor' | null;
      rol: string[];
      givenName: string | null;
      familyName: string | null;
      temaPreferido: 'claro' | 'oscuro' | 'sistema';
    };
    apiToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    personaId?: string | null;
    estado?: 'activa' | 'pendiente_tutor' | null;
    rol?: string[];
    givenName?: string | null;
    familyName?: string | null;
    temaPreferido?: 'claro' | 'oscuro' | 'sistema';
  }
}
