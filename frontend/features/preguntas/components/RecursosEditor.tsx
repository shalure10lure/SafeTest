'use client';

import {
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import {
    Image as ImageIcon,
    Plus,
    Sigma,
    Table2,
    X,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
    ObjetivoRecurso,
    RecursoPendiente,
    RecursosPreguntaEstado,
} from '../hooks/useRecursosPregunta';
import {
    errorFormula,
    errorTabla,
    LIMITES_TABLA,
    MAX_CARACTERES_FORMULA,
    MAX_RECURSOS_POR_PREGUNTA,
    tablaVacia,
    TIPOS_IMAGEN_PERMITIDOS,
} from '../recursos';
import type { ContenidoTabla, RecursoPregunta } from '../types';

import FormulaRenderizada, { errorLatex } from './FormulaRenderizada';
import ImagenRecurso from './ImagenRecurso';
import TablaRecurso from './TablaRecurso';

const BOTON =
    'inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-60';

const BOTON_PEQUENO =
    'inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50';

const CELDA =
    'h-8 w-full min-w-24 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600';

type Panel = 'tabla' | 'formula' | null;

interface RecursosEditorProps {
    recursos: RecursosPreguntaEstado;
    /** En edición los cambios se guardan al instante; al crear, junto con la pregunta. */
    enEdicion: boolean;
    /** Pregunta a la que pertenecen los recursos guardados (para mostrar sus imágenes). */
    preguntaId?: number;
}

function tamanoTabla(tabla: ContenidoTabla): string {
    return `${tabla.filas.length}×${tabla.filas[0]?.length ?? 0}`;
}

function etiquetaGuardado(item: RecursoPregunta): string {
    if (item.tipo === 'imagen') {
        return `Imagen: ${item.nombre_original ?? 'sin nombre'}`;
    }

    if (item.tipo === 'tabla' && typeof item.contenido === 'object') {
        return item.contenido
            ? `Tabla ${tamanoTabla(item.contenido)}`
            : 'Tabla';
    }

    return 'Fórmula';
}

function etiquetaPendiente(item: RecursoPendiente): string {
    if (item.tipo === 'imagen') return `Imagen: ${item.archivo.name}`;
    if (item.tipo === 'tabla') return `Tabla ${tamanoTabla(item.tabla)}`;

    return 'Fórmula';
}

function evitarEnvio(evento: KeyboardEvent<HTMLInputElement>) {
    // El editor vive dentro del formulario de la pregunta: Enter no debe guardarla.
    if (evento.key === 'Enter') evento.preventDefault();
}

function copiarTabla(tabla: ContenidoTabla): ContenidoTabla {
    return {
        encabezado: tabla.encabezado,
        filas: tabla.filas.map((fila) => [...fila]),
    };
}

function mismoObjetivo(a: ObjetivoRecurso | null, b: ObjetivoRecurso): boolean {
    if (a === null || a.origen !== b.origen) return false;

    return a.origen === 'guardado'
        ? b.origen === 'guardado' && a.recurso === b.recurso
        : b.origen === 'pendiente' && a.id === b.id;
}

interface TarjetaRecursoProps {
    titulo: string;
    pendiente: boolean;
    activa: boolean;
    deshabilitado: boolean;
    etiquetaEditar: string;
    onEditar: () => void;
    onQuitar: () => void;
    children: ReactNode;
}

/** Un elemento de contenido con su vista previa y sus acciones. */
function TarjetaRecurso({
    titulo,
    pendiente,
    activa,
    deshabilitado,
    etiquetaEditar,
    onEditar,
    onQuitar,
    children,
}: TarjetaRecursoProps) {
    return (
        <li
            className={cn(
                'rounded-lg border bg-white p-3',
                pendiente
                    ? 'border-dashed border-violet-300 bg-violet-50/40'
                    : 'border-slate-200',
                activa && 'ring-2 ring-violet-500',
            )}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700">
                    {titulo}
                    {pendiente && (
                        <span className="ml-2 font-normal text-violet-700">
                            (se guardará con la pregunta)
                        </span>
                    )}
                </span>

                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={onEditar}
                        disabled={deshabilitado}
                        aria-label={`${etiquetaEditar}: ${titulo}`}
                        className={BOTON_PEQUENO}
                    >
                        {etiquetaEditar}
                    </button>

                    <button
                        type="button"
                        onClick={onQuitar}
                        disabled={deshabilitado}
                        aria-label={`Quitar: ${titulo}`}
                        className={cn(BOTON_PEQUENO, 'hover:text-red-600')}
                    >
                        <X className="mr-1 size-3" aria-hidden="true" />
                        Quitar
                    </button>
                </div>
            </div>

            <div className="mt-2 max-w-full overflow-x-auto">{children}</div>
        </li>
    );
}

/**
 * Editor del contenido especializado de una pregunta: imágenes, tablas y
 * fórmulas. Muestra qué hay agregado; el contenido se dibuja completo en la
 * vista previa del formulario.
 */
export default function RecursosEditor({
    recursos,
    enEdicion,
    preguntaId,
}: RecursosEditorProps) {
    const entradaArchivo = useRef<HTMLInputElement>(null);
    // Si hay un objetivo, el archivo elegido reemplaza esa imagen en vez de agregar otra.
    const imagenAReemplazar = useRef<ObjetivoRecurso | null>(null);
    const [editando, setEditando] = useState<ObjetivoRecurso | null>(null);
    const [panel, setPanel] = useState<Panel>(null);
    const [latex, setLatex] = useState('');
    const [tabla, setTabla] = useState<ContenidoTabla>(() => tablaVacia());
    const [errorLocal, setErrorLocal] = useState('');

    const total = recursos.guardados.length + recursos.pendientes.length;
    const ocupado = recursos.ocupado || recursos.cargando;
    const bloqueado = ocupado || recursos.lleno;
    const mensajeError = errorLocal || recursos.error;
    const errorDeLatex = latex.trim() ? errorLatex(latex) : '';

    function abrirPanel(nuevo: Exclude<Panel, null>) {
        setErrorLocal('');
        recursos.limpiarError();

        if (editando !== null) {
            // Se estaba editando un elemento: se empieza uno nuevo desde cero.
            setEditando(null);
            setLatex('');
            setTabla(tablaVacia());
            setPanel(nuevo);

            return;
        }

        setPanel((actual) => (actual === nuevo ? null : nuevo));
    }

    function cerrarPanel() {
        setPanel(null);
        setEditando(null);
        setErrorLocal('');
    }

    function editarFormula(objetivo: ObjetivoRecurso, valor: string) {
        setErrorLocal('');
        recursos.limpiarError();
        setLatex(valor);
        setEditando(objetivo);
        setPanel('formula');
    }

    function editarTabla(objetivo: ObjetivoRecurso, valor: ContenidoTabla) {
        setErrorLocal('');
        recursos.limpiarError();
        setTabla(copiarTabla(valor));
        setEditando(objetivo);
        setPanel('tabla');
    }

    function elegirReemplazo(objetivo: ObjetivoRecurso) {
        setErrorLocal('');
        recursos.limpiarError();
        imagenAReemplazar.current = objetivo;
        entradaArchivo.current?.click();
    }

    function quitar(objetivo: ObjetivoRecurso) {
        if (mismoObjetivo(editando, objetivo)) cerrarPanel();

        if (objetivo.origen === 'guardado') {
            void recursos.quitarGuardado(objetivo.recurso);
        } else {
            recursos.quitarPendiente(objetivo.id);
        }
    }

    async function elegirImagen(evento: ChangeEvent<HTMLInputElement>) {
        const archivo = evento.target.files?.[0];

        // Permite elegir de nuevo el mismo archivo si se quitó.
        evento.target.value = '';

        if (!archivo) return;

        setErrorLocal('');

        const objetivo = imagenAReemplazar.current;

        imagenAReemplazar.current = null;

        if (objetivo) {
            await recursos.reemplazarImagen(objetivo, archivo);
        } else {
            await recursos.agregarImagen(archivo);
        }
    }

    async function guardarFormula() {
        const mensaje = errorFormula(latex) || errorLatex(latex);

        if (mensaje) {
            setErrorLocal(mensaje);
            return;
        }

        setErrorLocal('');

        const guardada = editando
            ? await recursos.actualizarFormula(editando, latex)
            : await recursos.agregarFormula(latex);

        if (guardada) {
            setLatex('');
            cerrarPanel();
        }
    }

    async function guardarTabla() {
        const mensaje = errorTabla(tabla);

        if (mensaje) {
            setErrorLocal(mensaje);
            return;
        }

        setErrorLocal('');

        const guardada = editando
            ? await recursos.actualizarTabla(editando, tabla)
            : await recursos.agregarTabla(tabla);

        if (guardada) {
            setTabla(tablaVacia());
            cerrarPanel();
        }
    }

    function cambiarCelda(fila: number, columna: number, valor: string) {
        setTabla((previa) => ({
            ...previa,
            filas: previa.filas.map((celdas, indiceFila) =>
                indiceFila === fila
                    ? celdas.map((celda, indiceColumna) =>
                          indiceColumna === columna ? valor : celda,
                      )
                    : celdas,
            ),
        }));
    }

    function agregarFila() {
        setTabla((previa) =>
            previa.filas.length >= LIMITES_TABLA.maxFilas
                ? previa
                : {
                      ...previa,
                      filas: [
                          ...previa.filas,
                          Array.from({ length: previa.filas[0].length }, () => ''),
                      ],
                  },
        );
    }

    function quitarFila() {
        setTabla((previa) =>
            previa.filas.length <= 1
                ? previa
                : { ...previa, filas: previa.filas.slice(0, -1) },
        );
    }

    function agregarColumna() {
        setTabla((previa) =>
            previa.filas[0].length >= LIMITES_TABLA.maxColumnas
                ? previa
                : {
                      ...previa,
                      filas: previa.filas.map((celdas) => [...celdas, '']),
                  },
        );
    }

    function quitarColumna() {
        setTabla((previa) =>
            previa.filas[0].length <= 1
                ? previa
                : {
                      ...previa,
                      filas: previa.filas.map((celdas) => celdas.slice(0, -1)),
                  },
        );
    }

    const botones: {
        etiqueta: string;
        icono: LucideIcon;
        activo: boolean;
        accion: () => void;
    }[] = [
        {
            etiqueta: 'Imagen',
            icono: ImageIcon,
            activo: false,
            accion: () => {
                imagenAReemplazar.current = null;
                entradaArchivo.current?.click();
            },
        },
        {
            etiqueta: 'Tabla',
            icono: Table2,
            activo: panel === 'tabla',
            accion: () => abrirPanel('tabla'),
        },
        {
            etiqueta: 'Fórmula',
            icono: Sigma,
            activo: panel === 'formula',
            accion: () => abrirPanel('formula'),
        },
    ];

    return (
        <section aria-labelledby="recursos-titulo" className="space-y-3">
            <div>
                <h2
                    id="recursos-titulo"
                    className="text-sm font-medium text-slate-700"
                >
                    Contenido especializado{' '}
                    <span className="font-normal text-slate-400">(opcional)</span>
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                    Agrega imágenes, tablas o fórmulas al enunciado.{' '}
                    {enEdicion
                        ? 'Los cambios en el contenido se guardan al instante.'
                        : 'El contenido se guardará junto con la pregunta.'}{' '}
                    ({total}/{MAX_RECURSOS_POR_PREGUNTA})
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {botones.map(({ etiqueta, icono: Icono, activo, accion }) => (
                    <button
                        key={etiqueta}
                        type="button"
                        onClick={accion}
                        disabled={bloqueado}
                        aria-pressed={activo}
                        className={cn(
                            BOTON,
                            activo && 'border-violet-400 bg-violet-50 text-violet-800',
                        )}
                    >
                        <Icono className="size-3.5" aria-hidden="true" />
                        {etiqueta}
                    </button>
                ))}

                <input
                    ref={entradaArchivo}
                    type="file"
                    accept={TIPOS_IMAGEN_PERMITIDOS.join(',')}
                    onChange={(evento) => void elegirImagen(evento)}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Elegir imagen"
                />
            </div>

            {recursos.cargando && (
                <p className="text-xs text-slate-500">Cargando contenido...</p>
            )}

            {panel === 'formula' && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    {editando && (
                        <p className="text-xs font-semibold text-violet-800">
                            Editando fórmula
                        </p>
                    )}

                    <label
                        htmlFor="formula-latex"
                        className="block text-xs font-medium text-slate-700"
                    >
                        Fórmula en LaTeX
                    </label>

                    <textarea
                        id="formula-latex"
                        value={latex}
                        onChange={(evento) => {
                            setLatex(evento.target.value);
                            setErrorLocal('');
                        }}
                        rows={2}
                        maxLength={MAX_CARACTERES_FORMULA}
                        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-600"
                    />

                    <div
                        aria-live="polite"
                        className="min-h-10 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2"
                    >
                        {latex.trim() && !errorDeLatex ? (
                            <FormulaRenderizada latex={latex} />
                        ) : (
                            <p className="text-xs text-slate-400">
                                {errorDeLatex
                                    ? `La fórmula tiene un error: ${errorDeLatex}`
                                    : 'La vista previa de la fórmula aparecerá aquí.'}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void guardarFormula()}
                            disabled={editando ? ocupado : bloqueado}
                            className={cn(BOTON, 'border-violet-300 text-violet-800')}
                        >
                            {!editando && (
                                <Plus className="size-3.5" aria-hidden="true" />
                            )}
                            {editando ? 'Guardar cambios' : 'Agregar fórmula'}
                        </button>

                        <button
                            type="button"
                            onClick={cerrarPanel}
                            className={BOTON}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {panel === 'tabla' && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    {editando && (
                        <p className="text-xs font-semibold text-violet-800">
                            Editando tabla
                        </p>
                    )}

                    <div className="overflow-x-auto">
                        <table className="border-separate border-spacing-1">
                            <tbody>
                                {tabla.filas.map((fila, indiceFila) => (
                                    <tr key={indiceFila}>
                                        {fila.map((celda, indiceColumna) => (
                                            <td key={indiceColumna}>
                                                <input
                                                    type="text"
                                                    value={celda}
                                                    onChange={(evento) =>
                                                        cambiarCelda(
                                                            indiceFila,
                                                            indiceColumna,
                                                            evento.target.value,
                                                        )
                                                    }
                                                    onKeyDown={evitarEnvio}
                                                    maxLength={
                                                        LIMITES_TABLA.maxCaracteresCelda
                                                    }
                                                    aria-label={`Fila ${indiceFila + 1}, columna ${indiceColumna + 1}`}
                                                    className={cn(
                                                        CELDA,
                                                        tabla.encabezado &&
                                                            indiceFila === 0 &&
                                                            'bg-slate-100 font-semibold',
                                                    )}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={agregarFila}
                            disabled={tabla.filas.length >= LIMITES_TABLA.maxFilas}
                            className={BOTON_PEQUENO}
                        >
                            + Fila
                        </button>
                        <button
                            type="button"
                            onClick={quitarFila}
                            disabled={tabla.filas.length <= 1}
                            className={BOTON_PEQUENO}
                        >
                            − Fila
                        </button>
                        <button
                            type="button"
                            onClick={agregarColumna}
                            disabled={
                                tabla.filas[0].length >= LIMITES_TABLA.maxColumnas
                            }
                            className={BOTON_PEQUENO}
                        >
                            + Columna
                        </button>
                        <button
                            type="button"
                            onClick={quitarColumna}
                            disabled={tabla.filas[0].length <= 1}
                            className={BOTON_PEQUENO}
                        >
                            − Columna
                        </button>

                        <label className="ml-1 flex items-center gap-2 text-xs text-slate-700">
                            <input
                                type="checkbox"
                                checked={tabla.encabezado}
                                onChange={(evento) =>
                                    setTabla((previa) => ({
                                        ...previa,
                                        encabezado: evento.target.checked,
                                    }))
                                }
                                className="size-4 accent-violet-600"
                            />
                            La primera fila es encabezado
                        </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void guardarTabla()}
                            disabled={editando ? ocupado : bloqueado}
                            className={cn(BOTON, 'border-violet-300 text-violet-800')}
                        >
                            {!editando && (
                                <Plus className="size-3.5" aria-hidden="true" />
                            )}
                            {editando ? 'Guardar cambios' : 'Agregar tabla'}
                        </button>

                        <button
                            type="button"
                            onClick={cerrarPanel}
                            className={BOTON}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {mensajeError && (
                <p
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    {mensajeError}
                </p>
            )}

            {total > 0 && (
                <ul className="space-y-2" aria-label="Contenido agregado">
                    {recursos.guardados.map((item) => {
                        const objetivo: ObjetivoRecurso = {
                            origen: 'guardado',
                            recurso: item.recurso,
                        };

                        return (
                            <TarjetaRecurso
                                key={item.recurso}
                                titulo={etiquetaGuardado(item)}
                                pendiente={false}
                                activa={mismoObjetivo(editando, objetivo)}
                                deshabilitado={ocupado}
                                etiquetaEditar={
                                    item.tipo === 'imagen' ? 'Reemplazar' : 'Editar'
                                }
                                onEditar={() => {
                                    if (item.tipo === 'imagen') {
                                        elegirReemplazo(objetivo);
                                    } else if (
                                        item.tipo === 'formula' &&
                                        typeof item.contenido === 'string'
                                    ) {
                                        editarFormula(objetivo, item.contenido);
                                    } else if (
                                        item.tipo === 'tabla' &&
                                        typeof item.contenido === 'object' &&
                                        item.contenido !== null
                                    ) {
                                        editarTabla(objetivo, item.contenido);
                                    }
                                }}
                                onQuitar={() => quitar(objetivo)}
                            >
                                {item.tipo === 'imagen' &&
                                    preguntaId !== undefined && (
                                        <ImagenRecurso
                                            nombre={
                                                item.nombre_original ??
                                                'Imagen de la pregunta'
                                            }
                                            preguntaId={preguntaId}
                                            recurso={item.recurso}
                                            claseImagen="max-h-28 max-w-48"
                                        />
                                    )}

                                {item.tipo === 'formula' &&
                                    typeof item.contenido === 'string' && (
                                        <FormulaRenderizada latex={item.contenido} />
                                    )}

                                {item.tipo === 'tabla' &&
                                    typeof item.contenido === 'object' &&
                                    item.contenido !== null && (
                                        <TablaRecurso tabla={item.contenido} />
                                    )}
                            </TarjetaRecurso>
                        );
                    })}

                    {recursos.pendientes.map((item) => {
                        const objetivo: ObjetivoRecurso = {
                            origen: 'pendiente',
                            id: item.id,
                        };

                        return (
                            <TarjetaRecurso
                                key={item.id}
                                titulo={etiquetaPendiente(item)}
                                pendiente
                                activa={mismoObjetivo(editando, objetivo)}
                                deshabilitado={ocupado}
                                etiquetaEditar={
                                    item.tipo === 'imagen' ? 'Reemplazar' : 'Editar'
                                }
                                onEditar={() => {
                                    if (item.tipo === 'imagen') {
                                        elegirReemplazo(objetivo);
                                    } else if (item.tipo === 'formula') {
                                        editarFormula(objetivo, item.latex);
                                    } else {
                                        editarTabla(objetivo, item.tabla);
                                    }
                                }}
                                onQuitar={() => quitar(objetivo)}
                            >
                                {item.tipo === 'imagen' && (
                                    <ImagenRecurso
                                        nombre={item.archivo.name}
                                        urlLocal={item.url}
                                        claseImagen="max-h-28 max-w-48"
                                    />
                                )}

                                {item.tipo === 'formula' && (
                                    <FormulaRenderizada latex={item.latex} />
                                )}

                                {item.tipo === 'tabla' && (
                                    <TablaRecurso tabla={item.tabla} />
                                )}
                            </TarjetaRecurso>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
