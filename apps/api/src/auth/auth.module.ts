import { Global, Module } from '@nestjs/common';
import { JwtNextAuthGuard } from './jwt-nextauth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { InternalLookupGuard } from './internal-lookup.guard.js';

@Global()
@Module({
  providers: [JwtNextAuthGuard, RolesGuard, InternalLookupGuard],
  exports: [JwtNextAuthGuard, RolesGuard, InternalLookupGuard],
})
export class AuthModule {}
