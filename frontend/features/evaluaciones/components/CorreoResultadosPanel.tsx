'use client';

import { useEffect, useState } from 'react';
import Alerta from '@/components/ui/Alerta';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { mensajeErrorCalificaciones } from '../services/calificaciones.service';
import {
  correoResultadosService,
  type EstadoCorreoResultados,
} from '../services/correo-resultados.service';

const etiquetas: Record<string, string> = {
  pendiente: 'Pendiente',
  enviando: 'Enviando',
  enviado: 'Enviado',
  error: 'Error',
};

export default function CorreoResultadosPanel({
  examenId,
  publicados,
}: {
  examenId: number;
  publicados: boolean;
}) {
  const [datos, setDatos] = useState<EstadoCorreoResultados | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [reintentando, setReintentando] = useState(false);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let activo = true;
    correoResultadosService.estado(examenId)
      .then((resultado) => {
        if (activo) {
          setDatos(resultado);
          setError(null);
        }
      })
      .catch((fallo: unknown) => { if (activo) setError(mensajeErrorCalificaciones(fallo)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [examenId, publicados]);

  async function configurar(habilitado: boolean) {
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await correoResultadosService.configurar(examenId, habilitado);
      setDatos(respuesta);
      if (habilitado) {
        toast.exito(
          'Envío por correo activado',
          'Cuando publiques las calificaciones, cada estudiante recibirá un correo institucional.',
        );
      } else {
        toast.info(
          'Envío por correo desactivado',
          'Las notas seguirán disponibles en la plataforma.',
        );
      }
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setGuardando(false);
    }
  }

  async function reintentar() {
    setReintentando(true);
    setError(null);
    try {
      const respuesta = await correoResultadosService.reintentar(examenId);
      setDatos(respuesta);
      const resumen = `${respuesta.enviados} enviados, ${respuesta.errores} con error.`;
      if (respuesta.errores > 0) {
        toast.aviso('Algunos correos no se pudieron enviar', `${resumen} Puedes volver a reintentar los fallidos.`);
      } else {
        toast.exito('Correos actualizados', resumen);
      }
    } catch (fallo: unknown) {
      setError(mensajeErrorCalificaciones(fallo));
    } finally {
      setReintentando(false);
    }
  }

  return (
    <section aria-label="Envío de resultados por correo" className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Envío de resultados por correo</h2>
          <p className="mt-1 text-xs text-slate-500">Enviar una notificación al publicar las notas oficiales. El resultado seguirá disponible en SafeTest.</p>
        </div>
        {datos?.resultados_publicados_en && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">Resultados publicados</span>
        )}
      </div>

      {cargando ? <p className="mt-4 text-sm text-slate-500">Consultando configuración de correo…</p> : null}
      {error && (
        <Alerta tono="error" titulo="No se pudo actualizar el envío por correo" className="mt-3" onCerrar={() => setError(null)}>
          {error}
        </Alerta>
      )}

      {datos && (
        <>
          <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={datos.enviar_resultados_correo}
              onChange={(event) => void configurar(event.target.checked)}
              disabled={guardando || !!datos.resultados_publicados_en}
              className="size-4 accent-violet-600"
            />
            Enviar resultados por correo institucional cuando se publiquen
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Gmail docente: {datos.gmail_conectado ? `Conectado (${datos.correo_remitente ?? 'cuenta autorizada'})` : 'No conectado. Conéctalo desde el botón de Google en el menú lateral para poder enviar correos.'}
            {datos.resultados_publicados_en ? ' · La configuración ya no se puede cambiar.' : ''}
          </p>
          {datos.enviar_resultados_correo && !datos.resultados_publicados_en && (
            <p className="mt-2 text-xs text-slate-600">
              Los correos se enviarán al pulsar <strong>Publicar resultados</strong>, una vez que hayas completado y confirmado la revisión.
            </p>
          )}

          {datos.resultados_publicados_en && datos.enviar_resultados_correo && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-emerald-700"><strong>{datos.enviados}</strong> enviados</span>
                <span className="text-red-700"><strong>{datos.errores}</strong> con error</span>
                <span className="text-amber-700"><strong>{datos.pendientes + datos.enviando}</strong> pendientes o procesándose</span>
                <button
                  type="button"
                  onClick={() => void correoResultadosService.estado(examenId).then(setDatos).catch((fallo: unknown) => setError(mensajeErrorCalificaciones(fallo)))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700"
                >Actualizar</button>
                {(datos.errores > 0 || datos.pendientes > 0) && (
                  <button type="button" disabled={reintentando} onClick={() => setConfirmacionAbierta(true)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                    {reintentando ? 'Reintentando…' : 'Reintentar fallidos'}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-2">Estudiante</th><th className="p-2">Correo institucional</th><th className="p-2">Estado</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {datos.envios.map((envio) => (
                      <tr key={envio.envio_id}>
                        <td className="p-2">{envio.nombre_completo}</td>
                        <td className="p-2">{envio.correo_institucional ?? 'Sin correo'}</td>
                        <td className={`p-2 font-medium ${envio.estado === 'enviado' ? 'text-emerald-700' : envio.estado === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                          {etiquetas[envio.estado] ?? envio.estado}
                        </td>
                      </tr>
                    ))}
                    {datos.envios.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-slate-500">No hay registros de envío.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {datos.resultados_publicados_en && !datos.enviar_resultados_correo && (
            <p className="mt-3 text-xs text-slate-500">Los resultados fueron publicados solo en la plataforma; el envío por correo estaba desactivado.</p>
          )}
        </>
      )}
      <ConfirmDialog
        abierto={confirmacionAbierta}
        titulo="¿Reintentar el envío de correos?"
        textoConfirmar="Reintentar envíos"
        textoCancelar="Cancelar"
        procesando={reintentando}
        onCancelar={() => setConfirmacionAbierta(false)}
        onConfirmar={async () => {
          await reintentar();
          setConfirmacionAbierta(false);
        }}
      >
        <p>
          Se volverán a intentar los correos pendientes o con error.
        </p>
        <p>
          Ten en cuenta que un fallo de red anterior podría haber entregado
          el mensaje sin que se recibiera la confirmación. Esto podría
          ocasionar un correo duplicado.
        </p>
      </ConfirmDialog>
    </section>
  );
}
