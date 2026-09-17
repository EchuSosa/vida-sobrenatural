import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      personaId: string | null;
      estado: 'activa' | 'pendiente_tutor' | null;
      rol: string[];
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
    temaPreferido?: 'claro' | 'oscuro' | 'sistema';
  }
}
