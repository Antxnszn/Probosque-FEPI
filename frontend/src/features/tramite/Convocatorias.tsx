import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { abrirArchivo, apiTramite, leerCuenta } from './cliente';
import { Cascaron, accion, campo, secundario } from './Cascaron';
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
  tipo?: string;
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

function enlacesSolicitar(fila: Convocatoria) {
  if (fila.programas.length <= 1) {
    const clave = fila.programas[0]?.clave || '';
    return [{ clave: clave || 'unico', nombre: 'Solicitar', to: `/tramite/solicitudes/nueva?convocatoria=${fila.id}${clave ? `&programa=${clave}` : ''}` }];
  }
  return fila.programas.map((programa) => ({
    clave: programa.clave,
    nombre: `Solicitar ${programa.nombre}`,
    to: `/tramite/solicitudes/nueva?convocatoria=${fila.id}&programa=${programa.clave}`,
  }));
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

export function Marco({ children }: { children: ReactNode; ancho?: string }) {
  return <Cascaron>{children}</Cascaron>;
}

export function PaginaConvocatorias() {
  const cuenta = leerCuenta();
  return (
    <Cascaron>
      {cuenta?.puesto === 'convocatorias' || cuenta?.puesto === 'super_admin'
        ? <AdminConvocatorias />
        : <ListaPublica aplicar={cuenta?.clase === 'solicitante'} />}
    </Cascaron>
  );
}

export function ListaPublica({ aplicar = false }: { aplicar?: boolean }) {
  const cuenta = leerCuenta();
  const publica = !cuenta;
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
    <>
      <div className="fila">
        <div>
          {publica ? <p className="subtitle">Sin sesión solo se consulta</p> : null}
          <h1>{publica ? 'Convocatorias 2026' : 'Convocatorias'}</h1>
        </div>
        {publica ? <Link className={accion} to="/tramite">Entrar para solicitar</Link> : null}
      </div>
      {error ? <p className="aviso">{error}</p> : null}
      {filas.length === 0 ? <p className="nota">Todavía no hay convocatorias publicadas.</p> : null}
      {filas.length > 0 ? (
        <section className="tabla"><table>
          <thead><tr><th>Título</th><th>Recepción</th><th></th></tr></thead>
          <tbody>
            {visibles.map((fila) => (
              <tr key={fila.id}>
                <td>{fila.titulo}</td>
                <td>{fila.lectura === 'Recepción abierta' ? `Hasta el ${fila.vigencia_fin}` : fila.lectura}</td>
                <td className="acciones">
                  <Link className={secundario} to={`/tramite/convocatorias/${fila.id}`}>Ver</Link>
                  {aplicar && fila.lectura === 'Recepción abierta' ? enlacesSolicitar(fila).map((enlace) => (
                    <Link key={enlace.clave} className={accion} to={enlace.to}>{enlace.nombre}</Link>
                  )) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table></section>
      ) : null}
      <Paginador pagina={pagina} total={filas.length} onPagina={setPagina} />
    </>
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
    <>
      <div className="fila">
        <div><h1>Convocatorias</h1></div>
        <Link className={accion} to="/tramite/convocatorias/nueva">Crear</Link>
      </div>
      {error ? <p className="aviso">{error}</p> : null}
      {filas.length === 0 ? <p className="nota">Todavía no hay convocatorias.</p> : null}
      {filas.length > 0 ? (
        <section className="tabla"><table>
          <thead><tr><th>Título</th><th>Programa</th><th>Fin</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {visibles.map((fila) => (
              <tr key={fila.id}>
                <td>{fila.titulo}</td>
                <td>{nombresPrograma(fila)}</td>
                <td>{fila.vigencia_fin}</td>
                <td><span className="estado">{fila.lectura}</span></td>
                <td className="acciones">
                  <Link className={secundario} to={`/tramite/convocatorias/${fila.id}`}>Ver</Link>
                  <Link className={secundario} to={`/tramite/convocatorias/${fila.id}/editar`}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></section>
      ) : null}
      <Paginador pagina={pagina} total={filas.length} onPagina={setPagina} />
    </>
  );
}

export function DetalleConvocatoria() {
  const { id } = useParams();
  const cuenta = leerCuenta();
  const [fila, setFila] = useState<Convocatoria | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria>(`/convocatorias/${id}`).then(setFila).catch((causa) => setError(mensajeDe(causa)));
  }, [id]);

  return (
    <Marco>
      <Link to="/tramite/convocatorias" className="btn btn-outline">Volver</Link>
      {error ? <p className="aviso">{error}</p> : null}
      {fila ? (
        <article>
          <p className="subtitle">{fila.lectura}</p>
          <h1>{fila.titulo}</h1>
          <p className="nota">Recepción de solicitudes del {fila.vigencia_inicio} al {fila.vigencia_fin}. {nombresPrograma(fila)}.</p>
          <p className="nota" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{fila.texto}</p>
          {fila.tiene_pdf ? (
            <button type="button" className={accion} onClick={() => abrirArchivo(`/api/tramite/v1/convocatorias/${fila.id}/pdf`).catch((causa) => setError(mensajeDe(causa)))}>Descargar convocatoria</button>
          ) : null}
          <p className="nota" style={{ marginTop: 12 }}>Los archivos de la solicitud los pide el programa de esta convocatoria, en datos técnicos. El formulario no vuelve a preguntar el programa.</p>
          {cuenta?.clase === 'solicitante' && fila.lectura === 'Recepción abierta' ? (
            <div className="acciones" style={{ marginTop: 12 }}>
              {enlacesSolicitar(fila).map((enlace) => (
                <Link key={enlace.clave} className={accion} to={enlace.to}>{enlace.nombre}</Link>
              ))}
            </div>
          ) : null}
          {fila.anexos.length > 0 ? (
            <div className="space-y-3">
              <h2>Materiales y resultados</h2>
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
  const [anexosNuevos, setAnexosNuevos] = useState<AnexoNuevo[]>([]);
  const [pdfNombre, setPdfNombre] = useState('');
  const [error, setError] = useState('');
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    apiTramite<Convocatoria>(`/convocatorias/${id}`).then((cuerpo) => {
      setFila(cuerpo);
      setProgramas(cuerpo.programas.map((programa) => programa.clave));
    }).catch((causa) => setError(mensajeDe(causa)));
  }, [id]);

  if (cuenta?.puesto !== 'convocatorias') {
    return <Marco><p>Esta cuenta no administra convocatorias.</p></Marco>;
  }

  function alternarPrograma(clave: string) {
    setProgramas((actual) => (actual.length === 1 && actual[0] === clave ? [] : [clave]));
  }

  function datosDe(formulario: HTMLFormElement) {
    const datos = new FormData(formulario);
    return {
      titulo: String(datos.get('titulo') || ''),
      texto: String(datos.get('texto') || ''),
      vigencia_inicio: String(datos.get('vigencia_inicio') || ''),
      vigencia_fin: String(datos.get('vigencia_fin') || ''),
      tipo: 'individual',
      programas,
      documentos: [] as string[],
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
    <Marco>
      <div className="fila">
        <h1>{id ? 'Editar convocatoria' : 'Nueva convocatoria'}</h1>
        <div className="acciones">
          <button className={secundario} type="submit" form="form-convocatoria" value="guardar">Guardar borrador</button>
          <button className={accion} type="submit" form="form-convocatoria" value="publicar">Publicar</button>
        </div>
      </div>
      <form id="form-convocatoria" onSubmit={guardar}>
        <section className="bloque"><div className="grupo">
        <label className="campo">Título<input name="titulo" required defaultValue={fila?.titulo || ''} /></label>
        <label className="campo">Texto<textarea name="texto" defaultValue={fila?.texto || 'El trámite es gratuito.'} /></label>
        <label className="campo">Inicio de recepción<input name="vigencia_inicio" type="date" required defaultValue={fila?.vigencia_inicio || ''} /></label>
        <label className="campo">Fin de recepción<input name="vigencia_fin" type="date" required defaultValue={fila?.vigencia_fin || ''} /></label>
        </div>
        <p className="nota" style={{ margin: '12px 0' }}>Cada convocatoria es de un solo programa.</p>
        <div className="checks">
          {PROGRAMAS.map((programa) => (
            <label key={programa.clave}>
              <input type="radio" name="programa" checked={programas.length === 1 && programas[0] === programa.clave} onChange={() => alternarPrograma(programa.clave)} />
              {programa.nombre}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <input
            ref={pdfRef}
            name="pdf"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(evento) => setPdfNombre(evento.target.files?.[0]?.name || '')}
          />
          <button type="button" className={secundario} onClick={() => pdfRef.current?.click()}>Subir PDF</button>
          <p className="nota" style={{ marginTop: 8 }}>{pdfNombre || 'Para publicar hacen falta título, texto, fechas válidas, un programa y el PDF. Los archivos de la solicitud los pide ese programa.'}</p>
        </div>
        {fila?.tiene_pdf ? <button type="button" className={secundario} onClick={() => abrirArchivo(`/api/tramite/v1/convocatorias/${fila.id}/pdf`).catch((causa) => setError(mensajeDe(causa)))}>Ver PDF actual</button> : null}
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
            <div key={indice} className="grupo" style={{ marginTop: 12 }}>
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
        {error ? <p className="aviso">{error}</p> : null}
        {fila?.estado === 'borrador' ? <button className={secundario} type="button" onClick={eliminar} style={{ marginTop: 12 }}>Eliminar</button> : null}
        </section>
      </form>
    </Marco>
  );
}
