
"use client";

import { useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import {
    CheckCircle2,
    Mail,
    Send,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";

import {
    conexionCorreoService,
    type EstadoConexionCorreo,
} from "@/features/auth/services/conexion-correo.service";

import {
    invitacionService,
    type Invitacion,
} from "../services/invitacion.service";

interface Props {
    paraleloId: number;
}

function mensajeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const mensaje = error.response?.data?.message;

        if (Array.isArray(mensaje)) {
            return mensaje.join(", ");
        }

        if (typeof mensaje === "string") {
            return mensaje;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado.";
}

function mostrarFecha(fecha: string | null): string {
    if (!fecha) return "—";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return "—";
    }

    return valor.toLocaleString("es-BO", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

export default function InvitacionesParalelo({
    paraleloId,
}: Props) {
    const { usuario, isInitializing } = useAuth();

    const [correo, setCorreo] = useState("");
    const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
    const [conexion, setConexion] =
        useState<EstadoConexionCorreo | null>(null);

    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [conectando, setConectando] = useState(false);

    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const conectado = conexion?.conectado === true;

    // CARGAR INVITACIONES Y ESTADO DE GMAIL
    useEffect(() => {
        if (isInitializing || usuario?.tipo !== "docente") {
            return;
        }

        if (!Number.isInteger(paraleloId) || paraleloId <= 0) {
            return;
        }

        let activo = true;

        async function cargarDatos() {
            try {
                const [lista, estadoGmail] = await Promise.all([
                    invitacionService.listar(paraleloId),
                    conexionCorreoService.obtenerEstado(),
                ]);

                if (!activo) return;

                setInvitaciones(lista);
                setConexion(estadoGmail);
            } catch (err) {
                if (activo) {
                    setError(mensajeError(err));
                }
            } finally {
                if (activo) {
                    setCargando(false);
                }
            }
        }

        void cargarDatos();

        return () => {
            activo = false;
        };
    }, [
        paraleloId,
        usuario?.id,
        usuario?.tipo,
        isInitializing,
    ]);

    // MOSTRAR RESULTADO DE LA CONEXIÓN DE GMAIL
    useEffect(() => {
        const parametros = new URLSearchParams(
            window.location.search,
        );

        const resultado = parametros.get("gmail");

        if (resultado === "conectada") {
            setMensaje("Gmail conectado correctamente.");
        } else if (resultado === "error") {
            setError(
                "Google no pudo completar la conexión de Gmail.",
            );
        } else if (resultado === "cancelado") {
            setError("La autorización fue cancelada.");
        }
    }, []);

    // CONECTAR GMAIL
    async function conectarGmail() {
        setError("");
        setMensaje("");
        setConectando(true);

        try {
            const respuesta =
                await conexionCorreoService.iniciarConexion();

            const destino = new URL(respuesta.url);

            if (
                destino.protocol !== "https:" ||
                destino.hostname !== "accounts.google.com"
            ) {
                throw new Error(
                    "La dirección de autorización de Google no es válida.",
                );
            }

            sessionStorage.setItem(
                "safetest_gmail_retorno",
                window.location.pathname,
            );

            window.location.assign(respuesta.url);
        } catch (err) {
            setError(mensajeError(err));
            setConectando(false);
        }
    }

    // ENVIAR INVITACIÓN
    async function enviarInvitacion(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (enviando) return;

        setError("");
        setMensaje("");

        const correoNormalizado = correo.trim().toLowerCase();

        if (!correoNormalizado) {
            setError("Ingresa el correo del estudiante.");
            return;
        }

        if (correoNormalizado.length > 150) {
            setError("El correo es demasiado largo.");
            return;
        }

        if (!conectado) {
            setError(
                "Debes conectar Gmail antes de invitar estudiantes.",
            );
            return;
        }

        setEnviando(true);

        try {
            const resultado = await invitacionService.crear(
                paraleloId,
                {
                    correo_institucional: correoNormalizado,
                },
            );

            setMensaje(resultado.message);
            setCorreo("");

            try {
                const lista = await invitacionService.listar(
                    paraleloId,
                );

                setInvitaciones(lista);
            } catch {
                setError(
                    "La invitación se envió, pero no se pudo actualizar el historial.",
                );
            }
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setEnviando(false);
        }
    }

    // VALIDACIONES DE ACCESO
    if (isInitializing) {
        return (
            < div className= "rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" >
            Verificando sesión...
        </div>
    );
    }

    if (usuario?.tipo !== "docente") {
        return (
            <p className= "text-sm text-red-600" >
            Solo los docentes pueden gestionar invitaciones.
      </p>
    );
    }

    if (!Number.isInteger(paraleloId) || paraleloId <= 0) {
        return (
            <p className= "text-sm text-red-600" >
            El paralelo seleccionado no es válido.
      </p>
    );
    }

    if (cargando) {
        return (
            <div className= "rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" >
            Cargando invitaciones...
        </div>
    );
    }

    return (
        <div className= "space-y-6" >
        {/* ENCABEZADO */ }
        < div >
        <h2 className="text-xl font-bold text-slate-900" >
            Invitaciones
            </h2>

            < p className = "mt-1 text-sm text-slate-500" >
                Invita estudiantes a este paralelo utilizando
          su correo electrónico.
        </p>
        </div>

    {/* ESTADO DE GMAIL */ }
    <section className="rounded-xl border border-slate-200 bg-white p-5" >
        <div className="flex flex-wrap items-center justify-between gap-4" >
            <div className="flex items-center gap-3" >
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600" >
                    <Mail size={ 20 } />
                        </div>

                        < div >
                        <p className="font-semibold text-slate-900" >
                            Correo de invitaciones
                                </p>

    {
        conectado ? (
            <p className= "mt-1 flex items-center gap-2 text-sm text-green-700" >
            <CheckCircle2 size={ 16 } />
                  Gmail conectado: { conexion?.correo }
        </p>
              ) : (
            <p className= "mt-1 text-sm text-amber-700" >
            Necesitas conectar Gmail para enviar.
                </p>
              )
    }
    </div>
        </div>

    {
        !conectado && (
            <button
              type="button"
        onClick = { conectarGmail }
        disabled = { conectando }
        className = "rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
        {
            conectando
            ? "Conectando..."
                : "Conectar Gmail"
        }
            </button>
          )
    }
    </div>
        </section>

    {/* FORMULARIO DE INVITACIÓN */ }
    <section className="rounded-xl border border-slate-200 bg-white p-6" >
        <h3 className="text-lg font-semibold text-slate-900" >
            Invitar estudiante
                </h3>

                < p className = "mt-1 text-sm text-slate-500" >
                    El estudiante recibirá un correo con un enlace
          de invitación al paralelo.
        </p>

        < form
    onSubmit = { enviarInvitacion }
    className = "mt-5 space-y-4"
        >
        <div>
        <label
              htmlFor="correoInvitacion"
    className = "mb-2 block text-sm font-medium text-slate-700"
        >
        Correo electrónico del estudiante
            </label>

            < input
    id = "correoInvitacion"
    type = "email"
    required
    maxLength = { 150}
    autoComplete = "email"
    placeholder = "estudiante@universidad.edu"
    value = { correo }
    onChange = {(event) =>
    setCorreo(event.target.value)
}
className = "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
    />
    </div>

{/* MENSAJE DE ERROR */ }
{
    error && (
        <div
              role="alert"
    className = "flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
        <AlertCircle
                size={ 18 }
    className = "shrink-0"
        />
        <span>{ error } </span>
        </div>
          )
}

{/* MENSAJE DE ÉXITO */ }
{
    mensaje && (
        <div
              role="status"
    className = "flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
        <CheckCircle2
                size={ 18 }
    className = "shrink-0"
        />
        <span>{ mensaje } </span>
        </div>
          )
}

<div className="flex justify-end" >
    <button
              type="submit"
disabled = {!conectado || enviando}
className = "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
    {
        enviando?(
                <RefreshCw
                  size = { 18}
                  className = "animate-spin"
                />
              ): (
                <Send size = { 18 } />
              )}

{
    enviando
        ? "Enviando invitación..."
        : "Enviar invitación"
}
</button>
    </div>
    </form>
    </section>

{/* HISTORIAL DE INVITACIONES */ }
<section className="overflow-hidden rounded-xl border border-slate-200 bg-white" >
    <div className="border-b border-slate-200 px-6 py-4" >
        <h3 className="font-semibold text-slate-900" >
            Invitaciones enviadas
                </h3>

                < p className = "mt-1 text-sm text-slate-500" >
                    { invitaciones.length } invitación(es)
registrada(s) en este paralelo.
          </p>
    </div>

{
    invitaciones.length === 0 ? (
        <div className= "px-6 py-12 text-center" >
        <Mail
              size={ 32 }
    className = "mx-auto text-slate-400"
        />

        <p className="mt-3 font-medium text-slate-700" >
            Aún no hay invitaciones
                </p>

                < p className = "mt-1 text-sm text-slate-500" >
                    Envía la primera invitación para comenzar.
            </p>
                        </div>
        ) : (
        <div className= "overflow-x-auto" >
        <table className="min-w-full text-left text-sm" >
            <thead className="bg-slate-50 text-slate-600" >
                <tr>
                <th className="px-6 py-3 font-semibold" >
                    Estudiante
                    </th>

                    < th className = "px-6 py-3 font-semibold" >
                        Estado
                        </th>

                        < th className = "px-6 py-3 font-semibold" >
                            Fecha de envío
                                </th>
                                </tr>
                                </thead>

                                < tbody className = "divide-y divide-slate-100" >
                                {
                                    invitaciones.map((invitacion) => (
                                        <tr key= { invitacion.invitacion_id } >
                                        <td className="px-6 py-4 text-slate-900" >
                                        { invitacion.correo_institucional }
                                        </td>

                                    < td className = "px-6 py-4" >
                                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${invitacion.estado === "pendiente"
                                            ? "bg-amber-50 text-amber-700"
                                            : invitacion.estado === "aceptada"
                                                ? "bg-green-50 text-green-700"
                                                : "bg-red-50 text-red-700"
                                        }`}
                                    >
                                {
                                    invitacion.estado === "pendiente"
                                        ? "Pendiente"
                                        : invitacion.estado === "aceptada"
                                            ? "Aceptada"
                                            : "Error de envío"
                                }
                                    </span>
                                    </td>

                                    < td className = "px-6 py-4 text-slate-500" >
                                        { mostrarFecha(invitacion.fecha_envio) }
                                        </td>
                                        </tr>
                ))
}
</tbody>
    </table>
    </div>
        )}
</section>
    </div>
  );
}
