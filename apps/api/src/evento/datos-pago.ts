import { diaCivilEnArgentina, MEDIOS_PAGO, type ErrorDeCampo, type MedioPago } from '@vida-sobrenatural/shared-types';
import { AppException } from '../common/errors/app-exception.js';

/** spec 011, FR-030 — los campos de un Pago (multipart: llegan como texto). Junta todos los errores (H-50). */
export function validarDatosPago(
  campos: { monto?: string; medio?: string; fechaPago?: string },
  conComprobante: boolean,
  comprobanteObligatorio: boolean,
): { monto: string; medio: MedioPago; fechaPago: Date } {
  const errores: ErrorDeCampo[] = [];
  const monto = Number(String(campos.monto ?? '').replace(',', '.'));
  if (!(monto > 0 && monto <= 99_999_999.99)) errores.push({ campo: 'monto', code: 'MONTO_INVALIDO' });
  if (!MEDIOS_PAGO.includes(campos.medio as MedioPago)) errores.push({ campo: 'medio', code: 'MEDIO_INVALIDO' });
  const fecha = String(campos.fechaPago ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(`${fecha}T00:00:00Z`).getTime())) {
    errores.push({ campo: 'fechaPago', code: 'FECHA_REQUERIDA' });
  } else if (fecha > diaCivilEnArgentina(new Date())) {
    errores.push({ campo: 'fechaPago', code: 'FECHA_PAGO_FUTURA' });
  }
  if (comprobanteObligatorio && !conComprobante) errores.push({ campo: 'comprobante', code: 'COMPROBANTE_REQUERIDO' });
  if (errores.length) throw new AppException('VALIDACION', 400, 'Revisá los datos del pago.', errores);
  return { monto: monto.toFixed(2), medio: campos.medio as MedioPago, fechaPago: new Date(`${fecha}T00:00:00Z`) };
}
