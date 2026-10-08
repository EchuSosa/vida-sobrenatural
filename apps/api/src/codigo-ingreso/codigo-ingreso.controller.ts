import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InternalLookupGuard } from '../auth/internal-lookup.guard.js';
import { AppException } from '../common/errors/app-exception.js';
import { CodigoIngresoService } from './codigo-ingreso.service.js';
import { PedirCodigoDto, VerificarCodigoDto } from './dto/codigo-ingreso.dto.js';

/**
 * spec 007 (T017, contracts/codigo-ingreso-api.md). Endpoints **internos**:
 * solo los llaman los servidores de `apps/web` y `apps/backoffice`, con
 * `X-Internal-Secret` (igual que `GET /personas/by-email`). Ningún navegador
 * los llama directo.
 */
@ApiTags('auth')
@Controller('auth/codigo-ingreso')
@UseGuards(InternalLookupGuard)
@ApiHeader({ name: 'X-Internal-Secret', required: true })
export class CodigoIngresoController {
  constructor(private readonly service: CodigoIngresoService) {}

  @Post('pedidos')
  @HttpCode(202)
  @ApiHeader({ name: 'X-Origen-Cliente', required: true, description: 'IP del navegador, tomada por el servidor de Next.' })
  @ApiAcceptedResponse({
    description:
      'Se envió el código. Igual para cualquier email, registrado o no (FR-008). 400 VALIDACION (EMAIL_INVALIDO), 429 DEMASIADOS_PEDIDOS con `reintentarEn` (segundos), 503 ENVIO_EMAIL_FALLIDO.',
  })
  async pedir(@Body() dto: PedirCodigoDto, @Headers('x-origen-cliente') origen: string | undefined): Promise<void> {
    if (!origen || !origen.trim()) {
      throw new AppException('VALIDACION', 400, 'Falta el header X-Origen-Cliente.');
    }
    await this.service.pedir(dto.email, origen.trim());
  }

  @Post('verificaciones')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Código correcto: queda usado y devuelve `{ email }` normalizado. 400 VALIDACION, 422 CODIGO_INCORRECTO (con `intentosRestantes`), CODIGO_SIN_INTENTOS o CODIGO_VENCIDO.',
  })
  verificar(@Body() dto: VerificarCodigoDto): Promise<{ email: string }> {
    return this.service.verificar(dto.email, dto.codigo);
  }
}
