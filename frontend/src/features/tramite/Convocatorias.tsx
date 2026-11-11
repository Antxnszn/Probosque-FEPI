import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PUESTOS, abrirArchivo, apiTramite, leerCuenta, salirTramite } from './cliente';

const titulo = "font-['Outfit',sans-serif] text-4xl font-light tracking-tight text-[#1B2A24]";
const accion = 'rounded-full bg-[#E0643A] px-5 py-2.5 text-sm font-semibold text-white';
const secundario = 'rounded-full bg-[#D9D1B8] px-5 py-2.5 text-sm font-semibold text-[#1B2A24] disabled:opacity-40';
const campo = 'mt-1 w-full border-b border-[#6B8B78]/50 bg-transparent py-2 text-[#1B2A24] focus:outline-none';
const POR_PAGINA = 5;

const PROGRAMAS = [
  { clave: 'CC', nombre: 'Capturando Carbono' },
  { clave: 'PSA', nombre: 'Pago por Servicios Ambientales Hidrológicos' },
  { clave: 'RHF', nombre: 'Restauración Hidrológico-Forestal' },
  { clave: 'PS', nombre: 'Plantaciones Sustentables' },
  { clave: 'MFS', nombre: 'Manejo Forestal Sustentable' },
];

type Programa = { clave: string; nombre: string };
type Anexo = { id: number; nombre: string; tipo: string; programa: string | null; nombre_programa: string | null };
type Convocatoria = {
  id: number;
  titulo: string;
  texto: string;
  vigencia_inicio: string;
  vigencia_fin: string;
  estado: string;
  lectura: string;
  tiene_pdf: boolean;
  programas: Programa[];
  documentos: string[];
  anexos: Anexo[];
};
type AnexoNuevo = { nombre: string; tipo: 'material' | 'resultado'; programa: string; archivo: File | null };

function mensajeDe(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

function nombresPrograma(fila: Convocatoria) {
  return fila.programas.map((programa) => programa.nombre).join(', ') || 'Sin programas';
}

function Paginador({ pagina, total, onPagina }: { pagina: number; total: number; onPagina: (valor: number) => void }) {
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const segura = Math.min(pagina, paginas - 1);
  const inicio = segura * POR_PAGINA;
  const fin = Math.min(total, inicio + POR_PAGINA);
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm tabular-nums text-[#355044]">{inicio + 1}–{fin} de {total}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secundario} disabled={segura === 0} onClick={() => onPagina(segura - 1)}>Anterior</button>
        {Array.from({ length: paginas }, (_, indice) => (
          <button key={indice} type="button" className={indice === segura ? accion : secundario} onClick={() => onPagina(indice)}>{indice + 1}</button>
        ))}
        <button type="button" className={secundario} disabled={segura >= paginas - 1} onClick={() => onPagina(segura + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

export function Marco({ children, ancho = 'max-w-3xl' }: { children: ReactNode; ancho?: string }) {
  const cuenta = leerCuenta();
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif]">
      <header className={`${ancho} mx-auto px-4 pt-6`}>
        <nav className="flex items-center justify-between rounded-full bg-[#D9D1B8] px-6 py-3.5">
          <Link to="/tramite" className="font-['Outfit',sans-serif] text-xl">PROBOSQUE</Link>
          <span className="text-sm text-[#355044]">Trámite de apoyos</span>
          {cuenta ? (
            <button type="button" className="text-sm font-semibold text-[#E0643A]" onClick={() => { salirTramite(); window.location.href = '/tramite'; }}>Salir</button>
          ) : (
            <Link to="/" className="text-sm text-[#355044]">Consulta forestal</Link>
          )}
        </nav>
      </header>
      <main className={`${ancho} mx-auto px-4 pt-12 pb-20`}>{children}</main>
    </div>
  );
}

export function ListaPublica({ aplicar = false }: { aplicar?: boolean }) {
  const [filas, setFilas] = useState<Convocatoria[]>([]);
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria[]>('/convocatorias')
      .then((lista) => setFilas(lista.filter((fila) => fila.estado === 'publicada')))
      .catch((causa) => setError(mensajeDe(causa)));
  }, []);

  const inicio = Math.min(pagina, Math.max(0, Math.ceil(filas.length / POR_PAGINA) - 1)) * POR_PAGINA;
  const visibles = filas.slice(inicio, inicio + POR_PAGINA);

  return (
    <section className="space-y-4">
      <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Convocatorias</h2>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {filas.length === 0 ? <p className="text-[#355044]">Todavía no hay convocatorias publicadas.</p> : null}
      {filas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#6B8B78]/40 text-[#355044]">
                <th className="px-3 py-3 font-medium">Título</th>
                <th className="px-3 py-3 font-medium">Programas</th>
                <th className="px-3 py-3 font-medium">Recepción</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => (
                <tr key={fila.id} className="border-b border-[#6B8B78]/20">
                  <td className="px-3 py-4 font-medium">{fila.titulo}</td>
                  <td className="px-3 py-4 text-[#355044]">{nombresPrograma(fila)}</td>
                  <td className="px-3 py-4">{fila.vigencia_inicio} a {fila.vigencia_fin}</td>
                  <td className="px-3 py-4">{fila.lectura}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link className={secundario} to={`/tramite/convocatorias/${fila.id}`}>Ver</Link>
                      {aplicar && fila.lectura === 'Recepción abierta' ? (
                        <Link className={accion} to={`/tramite/solicitudes/nueva?convocatoria=${fila.id}`}>Aplicar</Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginador pagina={pagina} total={filas.length} onPagina={setPagina} />
        </div>
      ) : null}
    </section>
  );
}

export function AdminConvocatorias() {
  const [filas, setFilas] = useState<Convocatoria[]>([]);
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria[]>('/convocatorias').then(setFilas).catch((causa) => setError(mensajeDe(causa)));
  }, []);

  const inicio = Math.min(pagina, Math.max(0, Math.ceil(filas.length / POR_PAGINA) - 1)) * POR_PAGINA;
  const visibles = filas.slice(inicio, inicio + POR_PAGINA);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#E0643A]">{PUESTOS.find((puesto) => puesto.id === 'convocatorias')?.nombre}</p>
          <h1 className={titulo}>Convocatorias</h1>
        </div>
        <Link className={accion} to="/tramite/convocatorias/nueva">Crear convocatoria</Link>
      </div>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {filas.length === 0 ? <p className="text-[#355044]">Todavía no hay convocatorias.</p> : null}
      {filas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#6B8B78]/40 text-[#355044]">
                <th className="px-3 py-3 font-medium">Título</th>
                <th className="px-3 py-3 font-medium">Programas</th>
                <th className="px-3 py-3 font-medium">Inicio</th>
                <th className="px-3 py-3 font-medium">Fin</th>
                <th className="px-3 py-3 font-medium">Lectura</th>
                <th className="px-3 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => (
                <tr key={fila.id} className="border-b border-[#6B8B78]/20">
                  <td className="px-3 py-4 font-medium">{fila.titulo}</td>
                  <td className="px-3 py-4 text-[#355044]">{nombresPrograma(fila)}</td>
                  <td className="px-3 py-4">{fila.vigencia_inicio}</td>
                  <td className="px-3 py-4">{fila.vigencia_fin}</td>
                  <td className="px-3 py-4">{fila.lectura}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link className={secundario} to={`/tramite/convocatorias/${fila.id}`}>Ver</Link>
                      <Link className={secundario} to={`/tramite/convocatorias/${fila.id}/editar`}>Editar</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginador pagina={pagina} total={filas.length} onPagina={setPagina} />
        </div>
      ) : null}
    </div>
  );
}

export function DetalleConvocatoria() {
  const { id } = useParams();
  const [fila, setFila] = useState<Convocatoria | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria>(`/convocatorias/${id}`).then(setFila).catch((causa) => setError(mensajeDe(causa)));
  }, [id]);

  return (
    <Marco ancho="max-w-3xl">
      <Link to="/tramite" className="text-sm text-[#355044]">Volver</Link>
      {error ? <p className="mt-6 text-[#E0643A]">{error}</p> : null}
      {fila ? (
        <article className="mt-6 space-y-6">
          <p className="text-sm font-semibold text-[#E0643A]">{fila.lectura}</p>
          <h1 className={titulo}>{fila.titulo}</h1>
          <p className="text-[#355044]">Recepción de solicitudes del {fila.vigencia_inicio} al {fila.vigencia_fin}. {nombresPrograma(fila)}.</p>
          <p className="whitespace-pre-wrap">{fila.texto}</p>
          {fila.tiene_pdf ? (
            <button type="button" className={accion} onClick={() => abrirArchivo(`/api/tramite/v1/convocatorias/${fila.id}/pdf`).catch((causa) => setError(mensajeDe(causa)))}>Descargar convocatoria</button>
          ) : null}
          {fila.documentos.length > 0 ? (
            <div>
              <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Documentos que pide</h2>
              <ul className="mt-3 list-disc pl-5 text-[#355044]">
                {fila.documentos.map((nombre) => <li key={nombre}>{nombre}</li>)}
              </ul>
            </div>
          ) : null}
          {fila.anexos.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Materiales y resultados</h2>
              {fila.anexos.map((anexo) => (
                <div key={anexo.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6B8B78]/20 py-3">
                  <p>{anexo.nombre}<span className="block text-sm text-[#355044]">{anexo.tipo === 'resultado' ? 'Resultado publicado' : 'Material de la convocatoria'}{anexo.nombre_programa ? ` · ${anexo.nombre_programa}` : ' · Toda la convocatoria'}</span></p>
                  <button type="button" className={secundario} onClick={() => abrirArchivo(`/api/tramite/v1/convocatorias/${fila.id}/anexos/${anexo.id}/archivo`).catch((causa) => setError(mensajeDe(causa)))}>Descargar</button>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      ) : null}
    </Marco>
  );
}

export function FormularioConvocatoria() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cuenta = leerCuenta();
  const [fila, setFila] = useState<Convocatoria | null>(null);
  const [programas, setProgramas] = useState<string[]>([]);
  const [documentos, setDocumentos] = useState<string[]>([]);
  const [documento, setDocumento] = useState('');
  const [anexosNuevos, setAnexosNuevos] = useState<AnexoNuevo[]>([]);
  const [pdfNombre, setPdfNombre] = useState('');
  const [error, setError] = useState('');
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    apiTramite<Convocatoria>(`/convocatorias/${id}`).then((cuerpo) => {
      setFila(cuerpo);
      setProgramas(cuerpo.programas.map((programa) => programa.clave));
      setDocumentos(cuerpo.documentos);
    }).catch((causa) => setError(mensajeDe(causa)));
  }, [id]);

  if (cuenta?.puesto !== 'convocatorias') {
    return <Marco><p>Esta cuenta no administra convocatorias.</p></Marco>;
  }

  function alternarPrograma(clave: string) {
    setProgramas((actual) => actual.includes(clave) ? actual.filter((item) => item !== clave) : [...actual, clave]);
  }

  function datosDe(formulario: HTMLFormElement) {
    const datos = new FormData(formulario);
    return {
      titulo: String(datos.get('titulo') || ''),
      texto: String(datos.get('texto') || ''),
      vigencia_inicio: String(datos.get('vigencia_inicio') || ''),
      vigencia_fin: String(datos.get('vigencia_fin') || ''),
      programas,
      documentos,
    };
  }

  async function subirExtras(convocatoriaId: number, formulario: HTMLFormElement) {
    const pdf = formulario.querySelector<HTMLInputElement>('input[name="pdf"]')?.files?.[0];
    if (pdf) {
      const cuerpo = new FormData();
      cuerpo.append('pdf', pdf);
      await apiTramite(`/convocatorias/${convocatoriaId}/pdf`, { method: 'POST', body: cuerpo });
    }
    for (const anexo of anexosNuevos) {
      if (!anexo.nombre.trim() || !anexo.archivo) continue;
      const cuerpo = new FormData();
      cuerpo.append('nombre', anexo.nombre.trim());
      cuerpo.append('tipo', anexo.tipo);
      cuerpo.append('programa', anexo.programa);
      cuerpo.append('archivo', anexo.archivo);
      await apiTramite(`/convocatorias/${convocatoriaId}/anexos`, { method: 'POST', body: cuerpo });
    }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    const formulario = evento.currentTarget;
    const publicar = (evento.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publicar';
    const cuerpo = datosDe(formulario);
    try {
      const guardada = id
        ? await apiTramite<Convocatoria>(`/convocatorias/${id}`, { method: 'PATCH', body: JSON.stringify(cuerpo) })
        : await apiTramite<Convocatoria>('/convocatorias', { method: 'POST', body: JSON.stringify(cuerpo) });
      await subirExtras(guardada.id, formulario);
      if (publicar) {
        await apiTramite(`/convocatorias/${guardada.id}/publicar`, { method: 'POST' });
      }
      navigate('/tramite');
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  async function quitarAnexo(anexoId: number) {
    if (!id) return;
    setError('');
    try {
      const actual = await apiTramite<Convocatoria>(`/convocatorias/${id}/anexos/${anexoId}`, { method: 'DELETE' });
      setFila(actual);
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  async function eliminar() {
    if (!id) return;
    setError('');
    try {
      await apiTramite(`/convocatorias/${id}`, { method: 'DELETE' });
      navigate('/tramite');
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  if (id && !fila && !error) {
    return <Marco><p className="text-[#355044]">Cargando la convocatoria.</p></Marco>;
  }

  return (
    <Marco ancho="max-w-3xl">
      <Link to="/tramite" className="text-sm text-[#355044]">Volver</Link>
      <h1 className={`${titulo} mt-6`}>{id ? 'Editar convocatoria' : 'Nueva convocatoria'}</h1>
      <p className="mt-3 max-w-xl text-[#355044]">El inicio y el fin son el periodo para recibir solicitudes. Después de esa fecha la convocatoria sigue visible.</p>
      <form className="mt-8 max-w-xl space-y-5" onSubmit={guardar}>
        <label className="block text-sm">Título<input name="titulo" required defaultValue={fila?.titulo || ''} className={campo} /></label>
        <label className="block text-sm">Texto<textarea name="texto" defaultValue={fila?.texto || ''} rows={6} className={`${campo} resize-y`} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">Inicio de recepción<input name="vigencia_inicio" type="date" required defaultValue={fila?.vigencia_inicio || ''} className={campo} /></label>
          <label className="block text-sm">Fin de recepción<input name="vigencia_fin" type="date" required defaultValue={fila?.vigencia_fin || ''} className={campo} /></label>
        </div>
        <fieldset>
          <legend className="text-sm">Programas que comprende</legend>
          <div className="mt-2 space-y-2">
            {PROGRAMAS.map((programa) => (
              <label key={programa.clave} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={programas.includes(programa.clave)} onChange={() => alternarPrograma(programa.clave)} />
                {programa.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="text-sm">PDF de la convocatoria</p>
          <input
            ref={pdfRef}
            name="pdf"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(evento) => setPdfNombre(evento.target.files?.[0]?.name || '')}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" className={accion} onClick={() => pdfRef.current?.click()}>Elegir PDF</button>
            <span className="text-sm text-[#355044]">{pdfNombre || 'Ningún archivo elegido'}</span>
          </div>
        </div>
        {fila?.tiene_pdf ? <button type="button" className={secundario} onClick={() => abrirArchivo(`/api/tramite/v1/convocatorias/${fila.id}/pdf`).catch((causa) => setError(mensajeDe(causa)))}>Ver PDF actual</button> : null}
        <div>
          <p className="text-sm">Documentos que pedirá la solicitud</p>
          <p className="mt-1 text-sm text-[#355044]">Nombres de lo que la persona tendrá que adjuntar al solicitar. El archivo lo sube ella, no aquí.</p>
          <div className="mt-2 flex gap-2">
            <input value={documento} onChange={(evento) => setDocumento(evento.target.value)} className={campo} placeholder="Nombre del documento" />
            <button type="button" className={secundario} onClick={() => {
              const limpio = documento.trim();
              if (!limpio || documentos.includes(limpio)) return;
              setDocumentos([...documentos, limpio]);
              setDocumento('');
            }}>Agregar</button>
          </div>
          <ul className="mt-3 space-y-2">
            {documentos.map((nombre) => (
              <li key={nombre} className="flex items-center justify-between gap-3 text-sm">
                <span>{nombre}</span>
                <button type="button" className="text-[#E0643A]" onClick={() => setDocumentos(documentos.filter((item) => item !== nombre))}>Quitar</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-sm">Anexos</p>
          <p className="text-sm text-[#355044]">Archivos que se publican con la convocatoria. El tipo y el programa solo sirven para mostrarlos ordenados.</p>
          {fila?.anexos.map((anexo) => (
            <div key={anexo.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{anexo.nombre} · {anexo.tipo === 'resultado' ? 'Resultado' : 'Material'}{anexo.nombre_programa ? ` · ${anexo.nombre_programa}` : ''}</span>
              <button type="button" className={secundario} onClick={() => quitarAnexo(anexo.id)}>Quitar</button>
            </div>
          ))}
          {anexosNuevos.map((anexo, indice) => (
            <div key={indice} className="grid gap-2 rounded-3xl bg-[#EAE4D3] p-4">
              <input value={anexo.nombre} placeholder="Nombre del anexo" className={campo} onChange={(evento) => {
                const copia = [...anexosNuevos];
                copia[indice] = { ...anexo, nombre: evento.target.value };
                setAnexosNuevos(copia);
              }} />
              <select value={anexo.tipo} className={campo} onChange={(evento) => {
                const copia = [...anexosNuevos];
                copia[indice] = { ...anexo, tipo: evento.target.value as AnexoNuevo['tipo'] };
                setAnexosNuevos(copia);
              }}>
                <option value="material">Material de la convocatoria</option>
                <option value="resultado">Resultado publicado</option>
              </select>
              <select value={anexo.programa} className={campo} onChange={(evento) => {
                const copia = [...anexosNuevos];
                copia[indice] = { ...anexo, programa: evento.target.value };
                setAnexosNuevos(copia);
              }}>
                <option value="">Toda la convocatoria</option>
                {PROGRAMAS.filter((programa) => programas.includes(programa.clave)).map((programa) => (
                  <option key={programa.clave} value={programa.clave}>{programa.nombre}</option>
                ))}
              </select>
              <input type="file" className="text-sm" onChange={(evento) => {
                const copia = [...anexosNuevos];
                copia[indice] = { ...anexo, archivo: evento.target.files?.[0] || null };
                setAnexosNuevos(copia);
              }} />
            </div>
          ))}
          <button type="button" className={secundario} onClick={() => setAnexosNuevos([...anexosNuevos, { nombre: '', tipo: 'material', programa: '', archivo: null }])}>Agregar anexo</button>
        </div>
        {error ? <p className="text-[#E0643A]">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button className={secundario} type="submit" value="guardar">Guardar</button>
          <button className={accion} type="submit" value="publicar">Publicar</button>
          {fila?.estado === 'borrador' ? <button className={secundario} type="button" onClick={eliminar}>Eliminar</button> : null}
        </div>
      </form>
    </Marco>
  );
}
