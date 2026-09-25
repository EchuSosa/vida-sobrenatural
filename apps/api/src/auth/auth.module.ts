import { Global, Module } from '@nestjs/common';
import { JwtNextAuthGuard } from './jwt-nextauth.guard.js';
import { PermisosGuard } from './permisos.guard.js';
import { InternalLookupGuard } from './internal-lookup.guard.js';

@Global()
@Module({
  providers: [JwtNextAuthGuard, PermisosGuard, InternalLookupGuard],
  exports: [JwtNextAuthGuard, PermisosGuard, InternalLookupGuard],
})
export class AuthModule {}
