import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PROGRAMAS, abrirArchivo, apiTramite, leerCuenta } from './cliente';
import { Marco } from './Convocatorias';
import { MapaPoligono } from './MapaPoligono';

const titulo = "font-['Outfit',sans-serif] text-4xl font-light tracking-tight text-[#1B2A24]";
const accion = 'rounded-full bg-[#E0643A] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40';
const secundario = 'rounded-full bg-[#D9D1B8] px-5 py-2.5 text-sm font-semibold text-[#1B2A24] disabled:opacity-40';
const campo = 'mt-1 w-full border-b border-[#6B8B78]/50 bg-transparent py-2 text-[#1B2A24] focus:outline-none';
const POR_PAGINA = 5;

const DELEGACIONES = ['Toluca', 'Naucalpan', 'Texcoco', 'Tejupilco', 'Atlacomulco', 'Coatepec Harinas', 'Valle de Bravo', 'Amecameca', 'Jilotepec'];
const TIPOS = [
  { id: 'persona_fisica', nombre: 'Persona física' },
  { id: 'persona_juridica', nombre: 'Persona jurídica' },
  { id: 'nucleo_agrario', nombre: 'Núcleo agrario' },
];
const IDENTIFICACIONES = [
  { id: 'ine', nombre: 'INE' },
  { id: 'pasaporte', nombre: 'Pasaporte' },
  { id: 'otra', nombre: 'Otra identificación oficial con fotografía' },
];

type Persona = { id?: number; papel: string; nombre: string; tipo_identificacion: string; sin_domicilio: boolean };
type Archivo = { id: number; clase: string; nombre: string; persona_id: number | null };
type Solicitud = {
  id: number;
  cuenta_id: number;
  cuenta_nombre?: string;
  convocatoria_id: number;
  programa: string;
  tipo: string;
  municipio: string;
  delegacion: string;
  estado: string;
  superficie_ha: number;
  tiene_poligono: boolean;
  creado_en: string | null;
  modificado_en: string | null;
  modificado_por_nombre?: string;
  personas: Persona[];
  archivos: Archivo[];
};
type Convocatoria = {
  id: number;
  titulo: string;
  lectura: string;
  programas: { clave: string; nombre: string }[];
  documentos: string[];
  creado_en?: string | null;
  creado_por_nombre?: string;
  modificado_en?: string | null;
  modificado_por_nombre?: string;
  estado?: string;
};
type Vertice = { lat: number; lng: number };

const PAPELES: Record<string, { papel: string; etiqueta: string; organizacion?: boolean }[]> = {
  persona_fisica: [
    { papel: 'titular', etiqueta: 'Titular' },
    { papel: 'segunda', etiqueta: 'Segunda persona beneficiaria' },
  ],
  persona_juridica: [
    { papel: 'titular', etiqueta: 'Razón social', organizacion: true },
    { papel: 'apoderado', etiqueta: 'Apoderado' },
    { papel: 'segunda', etiqueta: 'Segunda persona beneficiaria' },
  ],
  nucleo_agrario: [
    { papel: 'titular', etiqueta: 'Nombre del núcleo', organizacion: true },
    { papel: 'presidencia', etiqueta: 'Presidencia del comisariado' },
    { papel: 'secretaria', etiqueta: 'Secretaría del comisariado' },
    { papel: 'tesoreria', etiqueta: 'Tesorería del comisariado' },
    { papel: 'segunda', etiqueta: 'Segunda persona beneficiaria, del comisariado' },
  ],
};
const CARTA: { papel: string; etiqueta: string }[] = [
  { papel: 'otorgante', etiqueta: 'Otorgante' },
  { papel: 'representante', etiqueta: 'Apoderado' },
  { papel: 'testigo_1', etiqueta: 'Testigo 1' },
  { papel: 'testigo_2', etiqueta: 'Testigo 2' },
];

function mensajeDe(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

function personaVacia(papel: string): Persona {
  return { papel, nombre: '', tipo_identificacion: '', sin_domicilio: false };
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

export function TablaSolicitudes({ encabezado, texto }: { encabezado: string; texto: string }) {
  const [filas, setFilas] = useState<Solicitud[]>([]);
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState('');
  const cuenta = leerCuenta();
  const auditoria = cuenta?.puesto === 'super_admin';

  useEffect(() => {
    apiTramite<Solicitud[]>('/solicitudes').then(setFilas).catch((causa) => setError(mensajeDe(causa)));
  }, []);

  const inicio = Math.min(pagina, Math.max(0, Math.ceil(filas.length / POR_PAGINA) - 1)) * POR_PAGINA;
  const visibles = filas.slice(inicio, inicio + POR_PAGINA);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-['Outfit',sans-serif] text-2xl font-light">{encabezado}</h2>
        <p className="text-sm text-[#355044]">{texto}</p>
      </div>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {filas.length === 0 ? <p className="text-[#355044]">Todavía no hay solicitudes en esta bandeja.</p> : null}
      {filas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#6B8B78]/40 text-[#355044]">
                <th className="px-3 py-3 font-medium">Solicitud</th>
                <th className="px-3 py-3 font-medium">Programa</th>
                <th className="px-3 py-3 font-medium">Municipio</th>
                <th className="px-3 py-3 font-medium">Delegación</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                {auditoria ? <th className="px-3 py-3 font-medium">Quién y cuándo</th> : null}
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => (
                <tr key={fila.id} className="border-b border-[#6B8B78]/20">
                  <td className="px-3 py-4 font-medium">{fila.id}</td>
                  <td className="px-3 py-4">{PROGRAMAS[fila.programa] || fila.programa}</td>
                  <td className="px-3 py-4">{fila.municipio}</td>
                  <td className="px-3 py-4">{fila.delegacion}</td>
                  <td className="px-3 py-4">{fila.estado}</td>
                  {auditoria ? (
                    <td className="px-3 py-4 text-[#355044]">
                      {fila.cuenta_nombre || 'Sin nombre'} · {fila.modificado_en || fila.creado_en || ''}
                    </td>
                  ) : null}
                  <td className="px-3 py-4">
                    <Link className={secundario} to={`/tramite/solicitudes/${fila.id}`}>Abrir</Link>
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

export function TablaConvocatoriasAuditoria() {
  const [filas, setFilas] = useState<Convocatoria[]>([]);
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria[]>('/convocatorias').then(setFilas).catch((causa) => setError(mensajeDe(causa)));
  }, []);

  const inicio = Math.min(pagina, Math.max(0, Math.ceil(filas.length / POR_PAGINA) - 1)) * POR_PAGINA;
  const visibles = filas.slice(inicio, inicio + POR_PAGINA);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Convocatorias</h2>
        <p className="text-sm text-[#355044]">Consulta. Desde aquí no se publica ni se edita.</p>
      </div>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {filas.length === 0 ? <p className="text-[#355044]">Todavía no hay convocatorias.</p> : null}
      {filas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#6B8B78]/40 text-[#355044]">
                <th className="px-3 py-3 font-medium">Título</th>
                <th className="px-3 py-3 font-medium">Lectura</th>
                <th className="px-3 py-3 font-medium">Creó</th>
                <th className="px-3 py-3 font-medium">Último cambio</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((fila) => (
                <tr key={fila.id} className="border-b border-[#6B8B78]/20">
                  <td className="px-3 py-4 font-medium">{fila.titulo}</td>
                  <td className="px-3 py-4">{fila.lectura}</td>
                  <td className="px-3 py-4">{fila.creado_por_nombre || 'Sin registro'} · {fila.creado_en || ''}</td>
                  <td className="px-3 py-4">{fila.modificado_por_nombre || 'Sin registro'} · {fila.modificado_en || ''}</td>
                  <td className="px-3 py-4"><Link className={secundario} to={`/tramite/convocatorias/${fila.id}`}>Ver</Link></td>
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

function BotonPdf({ etiqueta, archivo, onArchivo }: { etiqueta: string; archivo: File | null; onArchivo: (archivo: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={ref} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(evento) => onArchivo(evento.target.files?.[0] || null)} />
      <button type="button" className={secundario} onClick={() => ref.current?.click()}>{etiqueta}</button>
      <span className="text-sm text-[#355044]">{archivo ? archivo.name : 'Sin archivo nuevo'}</span>
    </div>
  );
}

function BotonShapefile({
  partes,
  onPartes,
}: {
  partes: { shp?: File; shx?: File; dbf?: File };
  onPartes: (partes: { shp?: File; shx?: File; dbf?: File }) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function elegir(lista: FileList | null) {
    const siguientes = { ...partes };
    Array.from(lista || []).forEach((archivo) => {
      const nombre = archivo.name.toLowerCase();
      if (nombre.endsWith('.shp')) siguientes.shp = archivo;
      else if (nombre.endsWith('.shx')) siguientes.shx = archivo;
      else if (nombre.endsWith('.dbf')) siguientes.dbf = archivo;
    });
    onPartes(siguientes);
  }
  const elegidos = [partes.shp, partes.shx, partes.dbf].flatMap((archivo) => (archivo ? [archivo.name] : []));
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={ref} type="file" multiple accept=".shp,.shx,.dbf" className="hidden" onChange={(evento) => elegir(evento.target.files)} />
      <button type="button" className={secundario} onClick={() => ref.current?.click()}>Elegir shapefile</button>
      <span className="text-sm text-[#355044]">{elegidos.length ? elegidos.join(', ') : 'Sin shapefile'}</span>
    </div>
  );
}

function BloquePersona({
  persona,
  etiqueta,
  organizacion,
  onChange,
  archivoId,
  archivoCurp,
  archivoDom,
  onArchivo,
}: {
  persona: Persona;
  etiqueta: string;
  organizacion?: boolean;
  onChange: (persona: Persona) => void;
  archivoId: File | null;
  archivoCurp: File | null;
  archivoDom: File | null;
  onArchivo: (clave: string, archivo: File | null) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-[28px] bg-[#EAE4D3] p-5">
      <legend className="px-2 text-sm font-semibold">{etiqueta}</legend>
      <label className="block text-sm">Nombre
        <input className={campo} value={persona.nombre} onChange={(evento) => onChange({ ...persona, nombre: evento.target.value })} />
      </label>
      {organizacion ? null : (
        <>
          <label className="block text-sm">Identificación oficial con fotografía
            <select className={campo} value={persona.tipo_identificacion} onChange={(evento) => onChange({ ...persona, tipo_identificacion: evento.target.value })}>
              <option value="">Elige</option>
              {IDENTIFICACIONES.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}
            </select>
          </label>
          <BotonPdf etiqueta="Elegir PDF de la identificación" archivo={archivoId} onArchivo={(archivo) => onArchivo(`identificacion:${persona.papel}`, archivo)} />
          <BotonPdf etiqueta="Elegir PDF de la CURP" archivo={archivoCurp} onArchivo={(archivo) => onArchivo(`curp:${persona.papel}`, archivo)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={persona.sin_domicilio} onChange={(evento) => onChange({ ...persona, sin_domicilio: evento.target.checked })} />
            La identificación no trae domicilio
          </label>
          {persona.sin_domicilio ? (
            <BotonPdf etiqueta="Elegir comprobante de domicilio" archivo={archivoDom} onArchivo={(archivo) => onArchivo(`comprobante:${persona.papel}`, archivo)} />
          ) : null}
          <p className="text-xs text-[#355044]">Recibo de luz, teléfono, agua, predial o cable, no mayor a tres meses.</p>
        </>
      )}
    </fieldset>
  );
}

export function FormularioSolicitud() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      if (id) {
        const fila = await apiTramite<Solicitud>(`/solicitudes/${id}`);
        setSolicitud(fila);
        setConvocatoria(await apiTramite<Convocatoria>(`/convocatorias/${fila.convocatoria_id}`));
        return;
      }
      const convocatoriaId = params.get('convocatoria');
      if (!convocatoriaId) throw new Error('Abre la solicitud desde el botón Aplicar de una convocatoria');
      setConvocatoria(await apiTramite<Convocatoria>(`/convocatorias/${convocatoriaId}`));
    };
    cargar().catch((causa) => setError(mensajeDe(causa)));
  }, [id, params]);

  return (
    <Marco ancho="max-w-4xl">
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {!error && !convocatoria ? <p className="text-[#355044]">Cargando la solicitud.</p> : null}
      {convocatoria ? <Editor key={`${id || 'nueva'}-${solicitud?.modificado_en || ''}`} solicitud={solicitud} convocatoria={convocatoria} /> : null}
    </Marco>
  );
}

function Editor({ solicitud, convocatoria }: { solicitud: Solicitud | null; convocatoria: Convocatoria }) {
  const cuenta = leerCuenta();
  const propia = cuenta?.clase === 'solicitante' && (!solicitud || solicitud.cuenta_id === cuenta.id);
  const editable = propia && (!solicitud || solicitud.estado === 'borrador') && convocatoria.lectura === 'Recepción abierta';
  const [tipo, setTipo] = useState(solicitud?.tipo || 'persona_fisica');
  const [programa, setPrograma] = useState(solicitud?.programa || convocatoria.programas[0]?.clave || '');
  const [municipio, setMunicipio] = useState(solicitud?.municipio || '');
  const [delegacion, setDelegacion] = useState(solicitud?.delegacion || 'Toluca');
  const [personas, setPersonas] = useState<Persona[]>(() => personasIniciales(solicitud, tipo));
  const [carta, setCarta] = useState(() => Boolean(solicitud?.personas.some((persona) => persona.papel === 'otorgante')));
  const [archivos, setArchivos] = useState<Record<string, File | null>>({});
  const [vertices, setVertices] = useState<Vertice[]>([]);
  const [partes, setPartes] = useState<{ shp?: File; shx?: File; dbf?: File }>({});
  const [error, setError] = useState(() => {
    const previo = sessionStorage.getItem('fepi_solicitud_aviso');
    if (!previo) return '';
    sessionStorage.removeItem('fepi_solicitud_aviso');
    return previo;
  });
  const [ocupado, setOcupado] = useState(false);

  function cambiarTipo(siguiente: string) {
    setTipo(siguiente);
    setPersonas(personasIniciales(solicitud, siguiente));
  }

  function actualizar(papel: string, persona: Persona) {
    setPersonas((lista) => lista.map((item) => (item.papel === papel ? persona : item)));
  }

  async function guardar(enviar: boolean) {
    setError('');
    setOcupado(true);
    const cuerpo = {
      convocatoria_id: convocatoria.id,
      programa,
      tipo,
      municipio,
      delegacion,
      personas: personas.filter((persona) => persona.nombre.trim() && (carta || !CARTA.some((item) => item.papel === persona.papel))),
    };
    let guardada = solicitud;
    try {
      const ruta = solicitud ? `/solicitudes/${solicitud.id}` : '/solicitudes';
      let actual = await apiTramite<Solicitud>(ruta, { method: solicitud ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo) });
      guardada = actual;
      actual = await subirArchivos(actual, archivos);
      guardada = actual;
      const piezas = [partes.shp, partes.shx, partes.dbf].filter(Boolean).length;
      if (piezas === 3 && partes.shp && partes.shx && partes.dbf) {
        const predio = new FormData();
        predio.set('shp', partes.shp);
        predio.set('shx', partes.shx);
        predio.set('dbf', partes.dbf);
        actual = await apiTramite<Solicitud>(`/solicitudes/${actual.id}/shapefile`, { method: 'POST', body: predio });
      } else if (piezas > 0) {
        if (enviar) throw new Error('El shapefile va en tres archivos: .shp, .shx y .dbf');
        sessionStorage.setItem('fepi_solicitud_aviso', 'El borrador quedó guardado. El shapefile se guarda cuando estén .shp, .shx y .dbf.');
      } else if (vertices.length >= 3) {
        actual = await apiTramite<Solicitud>(`/solicitudes/${actual.id}/poligono`, {
          method: 'POST',
          body: JSON.stringify({ vertices }),
        });
      }
      if (enviar) {
        actual = await apiTramite<Solicitud>(`/solicitudes/${actual.id}/enviar`, { method: 'POST' });
      }
      window.location.assign(`/tramite/solicitudes/${actual.id}`);
    } catch (causa) {
      const mensaje = mensajeDe(causa);
      if (guardada?.id && guardada.id !== solicitud?.id) {
        sessionStorage.setItem('fepi_solicitud_aviso', mensaje);
        window.location.assign(`/tramite/solicitudes/${guardada.id}`);
        return;
      }
      setError(mensaje);
    } finally {
      setOcupado(false);
    }
  }

  const papeles: { papel: string; etiqueta: string; organizacion?: boolean }[] = carta
    ? [...(PAPELES[tipo] || []), ...CARTA]
    : (PAPELES[tipo] || []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-[#E0643A]">{convocatoria.titulo}</p>
        <h1 className={titulo}>{solicitud ? `Solicitud ${solicitud.id}` : 'Nueva solicitud'}</h1>
        <p className="text-[#355044]">Un predio por solicitud. {convocatoria.lectura}.</p>
      </div>
      {solicitud ? <Resumen solicitud={solicitud} /> : null}
      {editable ? (
        <div className="space-y-6">
          <label className="block text-sm">Programa
            <select className={campo} value={programa} onChange={(evento) => setPrograma(evento.target.value)}>
              {convocatoria.programas.map((item) => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm">Municipio del predio
            <input className={campo} value={municipio} onChange={(evento) => setMunicipio(evento.target.value)} />
          </label>
          <label className="block text-sm">Delegación que corresponde al municipio
            <select className={campo} value={delegacion} onChange={(evento) => setDelegacion(evento.target.value)}>
              {DELEGACIONES.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm">Tipo de solicitante
            <select className={campo} value={tipo} onChange={(evento) => cambiarTipo(evento.target.value)}>
              {TIPOS.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
          {papeles.map((item) => {
            const persona = personas.find((fila) => fila.papel === item.papel) || personaVacia(item.papel);
            return (
              <BloquePersona
                key={item.papel}
                persona={persona}
                etiqueta={item.etiqueta}
                organizacion={item.organizacion}
                onChange={(valor) => actualizar(item.papel, valor)}
                archivoId={archivos[`identificacion:${item.papel}`] || null}
                archivoCurp={archivos[`curp:${item.papel}`] || null}
                archivoDom={archivos[`comprobante:${item.papel}`] || null}
                onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))}
              />
            );
          })}
          {tipo === 'persona_fisica' ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={carta} onChange={(evento) => setCarta(evento.target.checked)} />
              Hay representante con carta poder
            </label>
          ) : null}
          {tipo === 'persona_juridica' ? (
            <BloqueArchivo titulo="Acta constitutiva, escritura o estatutos" texto="Tiene que mostrar las facultades de administración." clave="acta_constitutiva" archivos={archivos} onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))} />
          ) : null}
          {tipo === 'nucleo_agrario' ? (
            <>
              <BloqueArchivo titulo="Acta de asamblea de elección" texto="Inscrita o presentada al RAN." clave="acta_eleccion" archivos={archivos} onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))} />
              <BloqueArchivo titulo="Acta que autoriza dedicar el predio" texto="El núcleo autoriza destinar el predio al programa." clave="acta_predio" archivos={archivos} onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))} />
            </>
          ) : null}
          {carta ? (
            <BloqueArchivo titulo="Carta poder" texto="Otorgante, apoderado y dos testigos, con copia de su identificación." clave="carta_poder" archivos={archivos} onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))} />
          ) : null}
          {convocatoria.documentos.map((nombre) => (
            <BloqueArchivo key={nombre} titulo={nombre} texto="Documento que esta convocatoria pide con la solicitud." clave={`pedido:${nombre}`} archivos={archivos} onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))} />
          ))}
          <BloqueArchivo titulo="Acreditación de propiedad o posesión" texto="Siempre va aparte. El sistema no elige entre PHINA y escritura." clave="tenencia" archivos={archivos} onArchivo={(clave, archivo) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }))} />
          <div className="space-y-3">
            <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Predio</h2>
            <p className="text-sm text-[#355044]">Marca las esquinas en el mapa, o sube el shapefile si ya lo tienes. Son tres archivos: .shp, .shx y .dbf, en coordenadas geográficas. Si subes el shapefile, ese predio sustituye el dibujo.</p>
            <MapaPoligono vertices={vertices} onChange={setVertices} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secundario} onClick={() => setVertices((lista) => lista.slice(0, -1))}>Quitar último punto</button>
              <BotonShapefile partes={partes} onPartes={setPartes} />
            </div>
            {solicitud?.tiene_poligono ? <p className="text-sm text-[#355044]">Ya hay un polígono guardado. Superficie: {solicitud.superficie_ha} ha.</p> : null}
          </div>
          {error ? <p className="text-[#E0643A]">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={secundario} disabled={ocupado} onClick={() => guardar(false)}>Guardar borrador</button>
            <button type="button" className={accion} disabled={ocupado} onClick={() => guardar(true)}>Enviar</button>
          </div>
        </div>
      ) : (
        <p className="text-[#355044]">
            {solicitud?.estado === 'enviada'
            ? 'Esta solicitud ya fue enviada. La delegación todavía no le asigna folio.'
            : convocatoria.lectura !== 'Recepción abierta'
              ? 'La recepción no está abierta, así que no se puede aplicar.'
              : 'Esta solicitud solo se consulta.'}
        </p>
      )}
    </div>
  );
}

function personasIniciales(solicitud: Solicitud | null, tipo: string) {
  return [...(PAPELES[tipo] || []), ...CARTA].map((item) => {
    const previa = solicitud?.personas.find((persona) => persona.papel === item.papel);
    return previa ? { ...previa } : personaVacia(item.papel);
  });
}

function BloqueArchivo({
  titulo: nombre,
  texto,
  clave,
  archivos,
  onArchivo,
}: {
  titulo: string;
  texto: string;
  clave: string;
  archivos: Record<string, File | null>;
  onArchivo: (clave: string, archivo: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-['Outfit',sans-serif] text-2xl font-light">{nombre}</h2>
      <p className="text-sm text-[#355044]">{texto}</p>
      <BotonPdf etiqueta="Elegir PDF" archivo={archivos[clave] || null} onArchivo={(archivo) => onArchivo(clave, archivo)} />
    </div>
  );
}

function Resumen({ solicitud }: { solicitud: Solicitud }) {
  return (
    <div className="space-y-3 text-sm text-[#355044]">
      <p>{PROGRAMAS[solicitud.programa] || solicitud.programa} · {solicitud.municipio} · {solicitud.delegacion} · {solicitud.estado}</p>
      {solicitud.personas.map((persona) => <p key={persona.papel}>{persona.papel}: {persona.nombre}</p>)}
      <div className="flex flex-wrap gap-2">
        {solicitud.archivos.map((archivo) => (
          <button key={archivo.id} type="button" className={secundario} onClick={() => abrirArchivo(`/api/tramite/v1/solicitudes/${solicitud.id}/archivos/${archivo.id}`)}>
            {archivo.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

async function subirArchivos(solicitud: Solicitud, archivos: Record<string, File | null>) {
  let actual = solicitud;
  const entradas = Object.entries(archivos).filter((entrada): entrada is [string, File] => entrada[1] instanceof File);
  for (const [clave, archivo] of entradas) {
    const datos = new FormData();
    datos.set('archivo', archivo);
    if (clave.startsWith('pedido:')) {
      datos.set('clase', 'pedido');
      datos.set('nombre', clave.slice('pedido:'.length));
    } else if (clave.includes(':')) {
      const [clase, papel] = clave.split(':');
      const persona = actual.personas.find((item) => item.papel === papel);
      if (!persona?.id) continue;
      datos.set('clase', clase);
      datos.set('nombre', persona?.nombre || clase);
      datos.set('persona_id', String(persona?.id || 0));
    } else {
      datos.set('clase', clave);
      datos.set('nombre', archivo.name);
    }
    actual = await apiTramite<Solicitud>(`/solicitudes/${actual.id}/archivos`, { method: 'POST', body: datos });
  }
  return actual;
}
