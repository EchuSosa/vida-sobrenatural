'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleAlert, CircleCheck, CircleMinus, Info, MessageCircle, Phone, Search, Undo2, UserRound } from 'lucide-react';
import {
  type EstadoMiDiscipulado,
  type Franja,
  ApiError,
  apiFetch,
  erroresPorCampo,
  formatearDiaEnArgentina,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  ButtonLink,
  ConfirmDestructiveDialog,
  EditorDeFranjas,
  MensajeErrorCampo,
  ResumenErrores,
  minutosAHHMM,
  useEnvio,
  useValidacionCampos,
  type EtiquetasEditorFranjas,
} from '@vida-sobrenatural/ui';

/**
 * specs/004, Historias 1 y 2 (T019, T034): la tarjeta de Vida Nueva de Mi
 * camino. Cada estado de `EstadoMiDiscipulado` dice qué pasa después ("¿Y
 * ahora qué?", docs/15) con texto e ícono, nunca solo color (D81). La
 * Persona no distingue `pendiente` de `propuesta` (FR-026): la API ya se lo
 * da como `buscando`. Las acciones actualizan el estado sin recargar.
 */
export function MiCaminoCliente({ estadoInicial }: { estadoInicial: EstadoMiDiscipulado }) {
  const [estado, setEstadoBase] = useState(estadoInicial);
  // ajustes-ux #47: después de pedir o retirar, el foco va al título del
  // estado nuevo ("Estamos buscando a tu Discipulador"): el bloque cambia y
  // quien usa lector de pantalla o teclado sabe dónde quedó.
  const seccion = useRef<HTMLElement>(null);
  const [moverFoco, setMoverFoco] = useState(0);
  function setEstado(nuevo: EstadoMiDiscipulado) {
    setEstadoBase(nuevo);
    setMoverFoco((n) => n + 1);
  }
  useEffect(() => {
    if (moverFoco === 0) return;
    const destino =
      seccion.current?.querySelector<HTMLElement>('[data-titulo-estado]') ??
      seccion.current?.querySelector<HTMLElement>('#vida-nueva-titulo');
    destino?.focus();
  }, [moverFoco]);
  const t = useTranslations('miCamino.vidaNueva');
  const locale = useLocale();
  // Instantes (pedido, inicio, fin, baja): el día en Argentina, no en UTC.
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);

  return (
    <section ref={seccion} aria-labelledby="vida-nueva-titulo" className="flex flex-col gap-4 rounded-lg border border-border p-5">
      <h2 id="vida-nueva-titulo" tabIndex={-1} className="text-xl font-semibold outline-none">
        {t('titulo')}
      </h2>

      {estado.estado === 'lo_pide_su_tutor' && (
        <Aviso icono={<Info aria-hidden className="size-5 shrink-0 text-primary" />} titulo={t('tutorTitulo')}>
          {t('tutorTexto')}
        </Aviso>
      )}

      {(estado.estado === 'puede_pedir' || estado.estado === 'baja') && (
        <>
          {estado.estado === 'baja' && (
            <Aviso icono={<CircleMinus aria-hidden className="size-5 shrink-0 text-muted-foreground" />} titulo={t('bajaTitulo')}>
              {t('bajaTexto', { fecha: fecha(estado.en) })}
            </Aviso>
          )}
          {estado.estado === 'puede_pedir' && estado.ultimo && <UltimoDesenlace ultimo={estado.ultimo} />}
          <p className="text-muted-foreground">{t('introduccion')}</p>
          <FormularioPedir onPedido={setEstado} />
        </>
      )}

      {estado.estado === 'buscando' && <Buscando estado={estado} onCambio={setEstado} fecha={fecha} />}

      {estado.estado === 'en_curso' && (
        <Aviso icono={<UserRound aria-hidden className="size-5 shrink-0 text-primary" />} titulo={t('enCursoTitulo')}>
          <span className="flex flex-col gap-2">
            <span>{t('enCursoDiscipulador', { nombre: `${estado.discipulador.nombre} ${estado.discipulador.apellido}` })}</span>
            {estado.discipulador.telefono && <span>{t('enCursoTelefono', { telefono: estado.discipulador.telefono })}</span>}
            <span>{t('enCursoDesde', { fecha: fecha(estado.desde) })}</span>
            <span>{t('enCursoYAhora')}</span>
          </span>
        </Aviso>
      )}
      {/* ajustes-ux #46: la acción principal del estado "en curso" es
          escribirle o llamarlo — botones con ícono y verbo, no descubrir que
          el teléfono subrayado era el botón. */}
      {estado.estado === 'en_curso' && estado.discipulador.telefono && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ButtonLink
            href={`https://wa.me/${estado.discipulador.telefono.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            size="xl"
          >
            <MessageCircle aria-hidden />
            {t('enCursoWhatsApp')}
          </ButtonLink>
          <ButtonLink href={`tel:${estado.discipulador.telefono.replace(/\s/g, '')}`} variant="outline" size="xl">
            <Phone aria-hidden />
            {t('enCursoLlamar')}
          </ButtonLink>
        </div>
      )}

      {estado.estado === 'finalizado' && (
        <Aviso icono={<CircleCheck aria-hidden className="size-5 shrink-0 text-primary" />} titulo={t('finalizadoTitulo')}>
          {t('finalizadoTexto', { fecha: fecha(estado.finalizadoEn) })}
        </Aviso>
      )}
    </section>
  );
}

/** Un estado con ícono, título y qué pasa después. El ícono es decorativo: el título ya lo dice (D81). */
function Aviso({ icono, titulo, children }: { icono: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      {icono}
      <div className="flex flex-col gap-1">
        <p data-titulo-estado tabIndex={-1} className="font-medium outline-none">
          {titulo}
        </p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function UltimoDesenlace({ ultimo }: { ultimo: 'rechazada' | 'retirada' | 'abandono' }) {
  const t = useTranslations('miCamino.vidaNueva');
  const icono =
    ultimo === 'rechazada' ? <CircleAlert aria-hidden className="size-5 shrink-0 text-muted-foreground" /> : ultimo === 'retirada' ? <Undo2 aria-hidden className="size-5 shrink-0 text-muted-foreground" /> : <CircleMinus aria-hidden className="size-5 shrink-0 text-muted-foreground" />;
  const texto = ultimo === 'rechazada' ? t('ultimoRechazada') : ultimo === 'retirada' ? t('ultimoRetirada') : t('ultimoAbandono');
  return (
    <div className="flex gap-3">
      {icono}
      <p data-titulo-estado tabIndex={-1} className="text-muted-foreground outline-none">
        {texto}
      </p>
    </div>
  );
}

function useEtiquetasFranjas(): EtiquetasEditorFranjas {
  const t = useTranslations('franjas');
  const te = useTranslations('errors');
  return {
    dias: t.raw('dias') as EtiquetasEditorFranjas['dias'],
    dia: t('dia'),
    desde: t('desde'),
    hasta: t('hasta'),
    hora: t('hora'),
    minutos: t('minutos'),
    agregar: t('agregar'),
    quitar: t('quitar'),
    sinFranjas: t('sinFranjas'),
    errorRango: t('errorRango'),
    errorMuyCorta: te('campos.FRANJA_MUY_CORTA'),
    errorRepetida: te('campos.FRANJA_REPETIDA'),
    errorSuperpuesta: te('campos.FRANJA_SUPERPUESTA'),
    separador: t('separador'),
  };
}

/** Las llamadas a la API de esta tarjeta, con el token de la sesión. */
function useApiMiCamino() {
  const { data: session } = useSession();
  return function llamar<T>(ruta: string, init: RequestInit = {}) {
    return apiFetch<T>(ruta, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}`, ...init.headers },
    });
  };
}

/**
 * Las franjas con su validación por campo (H-50/H-72): al menos una, con el
 * error debajo del editor y en el resumen, con foco. El mismo bloque sirve
 * para pedir y para editar los horarios.
 */
function FormularioFranjas({
  inicial,
  textoEnviar,
  enviar,
  secundaria,
}: {
  inicial: Franja[];
  textoEnviar: string;
  enviar: (franjas: Franja[]) => Promise<void>;
  secundaria?: ReactNode;
}) {
  const t = useTranslations('miCamino');
  const te = useTranslations('errors');
  const etiquetas = useEtiquetasFranjas();
  const [franjas, setFranjas] = useState<Franja[]>(inicial);
  // ajustes-ux #40: lo elegido en los selectores sin "Agregar franja". Con la
  // lista vacía se toma eso: la persona ve "Martes 19:00 a 21:00" y cree que
  // ya lo cargó.
  const [pendiente, setPendiente] = useState<Franja | null>(null);
  const validacion = useValidacionCampos();

  const { enviando, ejecutar } = useEnvio(async () => {
    const aEnviar = franjas.length === 0 && pendiente ? [pendiente] : franjas;
    if (aEnviar.length === 0) {
      validacion.reemplazar({ franjas: t('vidaNueva.franjasRequeridas') });
      return;
    }
    try {
      await enviar(aEnviar);
    } catch (error) {
      if (erroresPorCampo(error)) {
        validacion.reemplazar({ franjas: t('vidaNueva.franjasRequeridas') });
        return;
      }
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errores.generico'));
    }
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ejecutar();
      }}
      className="flex flex-col gap-4"
    >
      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
      <fieldset
        id="campo-franjas"
        tabIndex={-1}
        aria-describedby={validacion.mensajes.franjas ? 'campo-franjas-error' : 'campo-franjas-ayuda'}
        className="flex flex-col gap-2 outline-none"
      >
        <legend className="font-medium">{t('vidaNueva.franjasTitulo')}</legend>
        <p id="campo-franjas-ayuda" className="text-sm text-muted-foreground">
          {t('vidaNueva.franjasAyuda')}
        </p>
        <EditorDeFranjas
          value={franjas}
          onChange={(nuevas) => {
            setFranjas(nuevas);
            if (nuevas.length > 0) validacion.limpiar('franjas');
          }}
          etiquetas={etiquetas}
          idBase="franja-pedido"
          disabled={enviando}
          onPendienteChange={setPendiente}
        />
        <MensajeErrorCampo id="campo-franjas-error" mensaje={validacion.mensajes.franjas} />
      </fieldset>
      {/* docs/15: principal a la derecha en escritorio, arriba en celular. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {secundaria}
        <Button type="submit" loading={enviando} className="h-11">
          {textoEnviar}
        </Button>
      </div>
    </form>
  );
}

function FormularioPedir({ onPedido }: { onPedido: (e: EstadoMiDiscipulado) => void }) {
  const t = useTranslations('miCamino.vidaNueva');
  const llamar = useApiMiCamino();
  return (
    <FormularioFranjas
      inicial={[]}
      textoEnviar={t('pedir')}
      enviar={async (franjas) => {
        try {
          await llamar('/discipulado/solicitudes/me', { method: 'POST', body: JSON.stringify({ franjas }) });
        } catch (error) {
          // Si ya había un pedido (otra pestaña), mostramos el estado real además del aviso.
          if (error instanceof ApiError && error.code === 'SOLICITUD_DISCIPULADO_YA_PENDIENTE') {
            onPedido(await llamar<EstadoMiDiscipulado>('/discipulado/me'));
          }
          throw error;
        }
        onPedido(await llamar<EstadoMiDiscipulado>('/discipulado/me'));
        toast.success(t('pedidoEnviado'));
      }}
    />
  );
}

function Buscando({
  estado,
  onCambio,
  fecha,
}: {
  estado: Extract<EstadoMiDiscipulado, { estado: 'buscando' }>;
  onCambio: (e: EstadoMiDiscipulado) => void;
  fecha: (iso: string) => string;
}) {
  const t = useTranslations('miCamino.vidaNueva');
  const tErrores = useTranslations('miCamino.errores');
  const etiquetas = useEtiquetasFranjas();
  const llamar = useApiMiCamino();
  const [editando, setEditando] = useState(false);

  const { enviando: retirando, ejecutar: retirar } = useEnvio(async () => {
    try {
      await llamar('/discipulado/solicitudes/me', { method: 'DELETE' });
      toast.success(t('pedidoRetirado'));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && tErrores.has(code) ? tErrores(code) : tErrores('generico'));
    }
    onCambio(await llamar<EstadoMiDiscipulado>('/discipulado/me'));
  });

  return (
    <>
      <Aviso icono={<Search aria-hidden className="size-5 shrink-0 text-primary" />} titulo={t('buscandoTitulo')}>
        <span className="flex flex-col gap-1">
          <span>{t('buscandoTexto', { fecha: fecha(estado.createdAt) })}</span>
          <span>{t('buscandoYAhora')}</span>
        </span>
      </Aviso>

      {editando ? (
        <FormularioFranjas
          inicial={estado.franjas}
          textoEnviar={t('guardarHorarios')}
          enviar={async (franjas) => {
            const nuevo = await llamar<EstadoMiDiscipulado>('/discipulado/solicitudes/me/franjas', {
              method: 'PUT',
              body: JSON.stringify({ franjas }),
            });
            onCambio(nuevo);
            setEditando(false);
            toast.success(t('horariosGuardados'));
          }}
          secundaria={
            <Button type="button" variant="ghost" className="h-11" onClick={() => setEditando(false)}>
              {t('volver')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="font-medium">{t('tusHorarios')}</h3>
            <ul className="flex flex-col gap-1">
              {estado.franjas.map((f, i) => (
                <li key={`${f.diaSemana}-${f.inicio}-${i}`} className="rounded-md border border-border px-3 py-2 text-sm">
                  {etiquetas.dias[f.diaSemana]} {minutosAHHMM(f.inicio)}
                  {etiquetas.separador}
                  {minutosAHHMM(f.fin)}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ConfirmDestructiveDialog
              trigger={
                <Button type="button" variant="outline" loading={retirando} className="h-11">
                  <Undo2 aria-hidden />
                  {t('retirar')}
                </Button>
              }
              titulo={t('retirarTitulo')}
              descripcion={t('retirarDescripcion')}
              textoConfirmar={t('retirarConfirmar')}
              textoCancelar={t('retirarMantener')}
              // D151: retirar el pedido se puede deshacer (se vuelve a pedir).
              tono="neutro"
              onConfirmar={() => void retirar()}
            />
            <Button type="button" variant="outline" className="h-11" onClick={() => setEditando(true)}>
              {t('editarHorarios')}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
