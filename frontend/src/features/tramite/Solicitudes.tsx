import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PROGRAMAS, abrirArchivo, apiTramite, leerCuenta } from './cliente';
import { Marco } from './Convocatorias';
import { MapaPoligono } from './MapaPoligono';
import { accion, secundario } from './Cascaron';
const POR_PAGINA = 5;

const DELEGACIONES = ['Toluca', 'Naucalpan', 'Texcoco', 'Tejupilco', 'Atlacomulco', 'Coatepec Harinas', 'Valle de Bravo', 'Amecameca', 'Jilotepec'];
const TECNICOS: Record<string, { clave: string; titulo: string; texto: string }[]> = {
  CC: [{ clave: 'registro_plantacion', titulo: 'Registro de la plantación', texto: 'Solo si es comercial maderable o navideña. Acredita que el registro ya se hizo o está en trámite.' }],
  PSA: [],
  RHF: [{ clave: 'proyecto_tecnico', titulo: 'Proyecto técnico de restauración', texto: 'En la modalidad 1 va siempre. En la modalidad 2, solo si cambió la superficie o las actividades.' }],
  PS: [{ clave: 'constancia_plantacion', titulo: 'Constancia de registro de plantación', texto: 'Solo en el concepto de Navidad.' }],
  MFS: [
    { clave: 'oficio_autorizacion', titulo: 'Oficio de autorización o documento técnico unificado', texto: 'Para estudios o certificación de manejo.' },
    { clave: 'autorizacion_centro', titulo: 'Autorización de funcionamiento', texto: 'Solo si es un centro de transformación.' },
    { clave: 'carta_abastecimiento', titulo: 'Carta de abastecimiento', texto: 'Solo si la madera viene de otros predios.' },
    { clave: 'croquis_industria', titulo: 'Croquis de la industria', texto: 'Solo para cadena de custodia.' },
    { clave: 'certificado_fsc', titulo: 'Copia del certificado vigente', texto: 'Solo en el mantenimiento del certificado.' },
  ],
};
type Persona = {
  id?: number;
  papel: string;
  nombre: string;
  tipo_identificacion: string;
  sin_domicilio: boolean;
  primer_apellido: string;
  segundo_apellido: string;
  fecha_nacimiento: string;
  sexo: string;
  estado_civil: string;
  grado_estudios: string;
  folio_identificacion: string;
  nacionalidad: string;
  entidad_nacimiento: string;
  curp: string;
  telefono_fijo: string;
  celular: string;
  correo: string;
  red_social: string;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  entre_calles: string;
  referencia_domicilio: string;
  colonia: string;
  localidad_domicilio: string;
  municipio_domicilio: string;
  entidad_domicilio: string;
  codigo_postal: string;
};
type Refrendo = { anio: number; folio: string };
type Archivo = { id: number; clase: string; nombre: string; persona_id: number | null };
export type Solicitud = {
  id: number;
  cuenta_id: number;
  cuenta_nombre?: string;
  convocatoria_id: number;
  programa: string;
  tipo: string;
  etiqueta?: string;
  grupo?: string;
  documentacion_en_probosque?: boolean;
  declaratoria_sin_litigio?: boolean;
  aviso_privacidad?: boolean;
  nombre_predio?: string;
  localidad?: string;
  programa_manejo?: boolean;
  tipo_certificado?: string;
  refrendos?: Refrendo[];
  municipio: string;
  delegacion: string;
  estado: string;
  folio?: string;
  quien_recibio?: string;
  fecha_recepcion?: string | null;
  observaciones?: string;
  lugar_visita?: string;
  fecha_visita?: string | null;
  correccion?: string;
  fecha_limite_subsanacion?: string | null;
  superficie_ha: number;
  tiene_poligono: boolean;
  vertices?: { lat: number; lng: number }[];
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

const ETIQUETAS = [
  { id: 'propietario', nombre: 'Propietario', detalle: 'Persona física', tipo: 'persona_fisica' },
  { id: 'poseedor', nombre: 'Poseedor', detalle: 'Persona física', tipo: 'persona_fisica' },
  { id: 'otro', nombre: 'Otro', detalle: 'Persona física, sin otro bloque', tipo: 'persona_fisica' },
  { id: 'sociedad', nombre: 'Sociedad', detalle: 'Persona jurídica y apoderado', tipo: 'persona_juridica' },
  { id: 'nucleo_agrario', nombre: 'Núcleo Agrario', detalle: 'Comisariado, no es sociedad', tipo: 'nucleo_agrario' },
];
const GRUPOS = [
  { id: 'ninguno', nombre: 'Ninguno' },
  { id: 'mujeres_pueblos_indigenas', nombre: 'Mujeres y pueblos indígenas' },
  { id: 'afromexicanas', nombre: 'Afromexicanas' },
  { id: 'enfermedades_cronicas', nombre: 'Enfermedades crónico degenerativas' },
  { id: 'victimas', nombre: 'Víctimas u ofendidas' },
  { id: 'repatriadas', nombre: 'Repatriadas' },
  { id: 'cuidadoras', nombre: 'Mujeres cuidadoras' },
];
const PASOS = ['Refrendos', 'Solicitante', 'Predio', 'Datos técnicos', 'Documentos', 'Declaraciones', 'Revisión'];

function personaVacia(papel: string): Persona {
  return {
    papel, nombre: '', tipo_identificacion: '', sin_domicilio: false,
    primer_apellido: '', segundo_apellido: '', fecha_nacimiento: '', sexo: '', estado_civil: '',
    grado_estudios: '', folio_identificacion: '', nacionalidad: '', entidad_nacimiento: '', curp: '',
    telefono_fijo: '', celular: '', correo: '', red_social: '', calle: '', numero_exterior: '',
    numero_interior: '', entre_calles: '', referencia_domicilio: '', colonia: '', localidad_domicilio: '',
    municipio_domicilio: '', entidad_domicilio: '', codigo_postal: '',
  };
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
        <div className="tabla">
          <table>
            <thead>
              <tr className="border-b border-[#6B8B78]/40 text-[#355044]">
                <th className="px-3 py-3 font-medium">Predio</th>
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
                  <td className="px-3 py-4 font-medium">{fila.nombre_predio || `Solicitud ${fila.id}`}</td>
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
                    <Link className={secundario} to={`/tramite/solicitudes/${fila.id}`}>Ver</Link>
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
        <div className="tabla">
          <table>
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
      <button type="button" className="btn btn-outline" onClick={() => ref.current?.click()}>Subir .shp .shx .dbf</button>
      <span className="text-sm text-[#355044]">{elegidos.length ? elegidos.join(', ') : 'Sin shapefile'}</span>
    </div>
  );
}

function Texto({
  etiqueta,
  valor,
  placeholder,
  requerido,
  tipo = 'text',
  onChange,
}: {
  etiqueta: string;
  valor: string;
  placeholder: string;
  requerido?: boolean;
  tipo?: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label>{etiqueta}{requerido ? <span className="required"> *</span> : null}</label>
      <input type={tipo} value={valor} placeholder={placeholder} onChange={(evento) => onChange(evento.target.value)} />
    </div>
  );
}

function CamposPersona({
  persona,
  titulo,
  organizacion,
  completa,
  onChange,
}: {
  persona: Persona;
  titulo: string;
  organizacion?: boolean;
  completa?: boolean;
  onChange: (persona: Persona) => void;
}) {
  return (
    <section>
      <p className="field-label" style={{ marginTop: 22 }}>{titulo}</p>
      {organizacion ? null : <p className="helper">Nombre y apellidos, como en el formato.</p>}
      <div className="name-fields">
        <Texto etiqueta={organizacion ? 'Nombre' : 'Nombre(s)'} valor={persona.nombre} placeholder="Ingresa tu nombre(s)" requerido onChange={(valor) => onChange({ ...persona, nombre: valor })} />
        {organizacion ? null : <Texto etiqueta="Primer apellido" valor={persona.primer_apellido} placeholder="Ingresa tu primer apellido" requerido onChange={(valor) => onChange({ ...persona, primer_apellido: valor })} />}
        {organizacion ? null : <Texto etiqueta="Segundo apellido" valor={persona.segundo_apellido} placeholder="Ingresa tu segundo apellido" onChange={(valor) => onChange({ ...persona, segundo_apellido: valor })} />}
      </div>
      {completa ? (
        <>
          <p className="field-label" style={{ marginTop: 22 }}>Identidad</p>
          <div className="name-fields">
            <Texto etiqueta="Fecha de nacimiento" valor={persona.fecha_nacimiento || ''} placeholder="AAAA-MM-DD" tipo="date" onChange={(valor) => onChange({ ...persona, fecha_nacimiento: valor })} />
            <Texto etiqueta="CURP" valor={persona.curp} placeholder="CURP" onChange={(valor) => onChange({ ...persona, curp: valor })} />
            <Texto etiqueta="Folio de la identificación" valor={persona.folio_identificacion} placeholder="INE, pasaporte u otra" onChange={(valor) => onChange({ ...persona, folio_identificacion: valor })} />
          </div>
          <p className="field-label" style={{ marginTop: 22 }}>Contacto</p>
          <div className="name-fields">
            <Texto etiqueta="Celular" valor={persona.celular} placeholder="Se guarda, no se envía" onChange={(valor) => onChange({ ...persona, celular: valor })} />
            <Texto etiqueta="Correo" valor={persona.correo} placeholder="Se guarda, no se envía" onChange={(valor) => onChange({ ...persona, correo: valor })} />
            <Texto etiqueta="Teléfono fijo" valor={persona.telefono_fijo} placeholder="" onChange={(valor) => onChange({ ...persona, telefono_fijo: valor })} />
          </div>
          <p className="field-label" style={{ marginTop: 22 }}>Domicilio</p>
          <div className="name-fields">
            <Texto etiqueta="Calle" valor={persona.calle} placeholder="" onChange={(valor) => onChange({ ...persona, calle: valor })} />
            <Texto etiqueta="Colonia" valor={persona.colonia} placeholder="" onChange={(valor) => onChange({ ...persona, colonia: valor })} />
            <Texto etiqueta="Código postal" valor={persona.codigo_postal} placeholder="" onChange={(valor) => onChange({ ...persona, codigo_postal: valor })} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function FilaDoc({
  titulo,
  texto,
  clave,
  archivos,
  onArchivo,
  requerido,
}: {
  titulo: string;
  texto: string;
  clave: string;
  archivos: Record<string, File | null>;
  onArchivo: (clave: string, archivo: File | null) => void;
  requerido?: boolean;
}) {
  const archivo = archivos[clave] || null;
  return (
    <div className="doc-row">
      <input className="doc-check" type="checkbox" checked={Boolean(archivo)} readOnly aria-label={titulo} />
      <label className="doc-label">{titulo}{requerido ? <span className="required"> *</span> : null}<small>{texto}</small></label>
      <div className="doc-upload">
        <label className="upload-btn">
          Seleccionar archivo
          <input type="file" accept=".pdf,application/pdf" onChange={(evento) => onArchivo(clave, evento.target.files?.[0] || null)} />
        </label>
      </div>
      <span className={archivo ? 'doc-status filled' : 'doc-status'}>{archivo ? archivo.name : 'Sin archivo'}</span>
    </div>
  );
}

function IconoDocumento() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

function Marca({ listo }: { listo: boolean }) {
  return listo ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-label="Completado"><path d="m5 12 4 4L19 6" /></svg>
  ) : null;
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
      {convocatoria ? <Editor key={`${id || 'nueva'}-${solicitud?.modificado_en || ''}`} solicitud={solicitud} convocatoria={convocatoria} programaUrl={params.get('programa') || ''} onCambio={setSolicitud} /> : null}
    </Marco>
  );
}

function Editor({ solicitud, convocatoria, programaUrl, onCambio }: { solicitud: Solicitud | null; convocatoria: Convocatoria; programaUrl: string; onCambio: (fila: Solicitud) => void }) {
  const cuenta = leerCuenta();
  const propia = cuenta?.clase === 'solicitante' && (!solicitud || solicitud.cuenta_id === cuenta.id);
  const enCorreccion = solicitud?.estado === 'subsanacion';
  const editable = propia && (!solicitud || solicitud.estado === 'borrador' || enCorreccion) && (enCorreccion || convocatoria.lectura === 'Recepción abierta');
  const claves = convocatoria.programas.map((item) => item.clave);
  const programa = solicitud?.programa || (claves.includes(programaUrl) ? programaUrl : '') || (claves.length === 1 ? claves[0] : '');
  const [tipo, setTipo] = useState(solicitud?.tipo || 'persona_fisica');
  const [municipio, setMunicipio] = useState(solicitud?.municipio || '');
  const [delegacion, setDelegacion] = useState(solicitud?.delegacion || 'Toluca');
  const [paso, setPaso] = useState(0);
  const [etiqueta, setEtiqueta] = useState(solicitud?.etiqueta || 'propietario');
  const [grupo, setGrupo] = useState(solicitud?.grupo || 'ninguno');
  const [nombrePredio, setNombrePredio] = useState(solicitud?.nombre_predio || '');
  const [localidad, setLocalidad] = useState(solicitud?.localidad || '');
  const [programaManejo, setProgramaManejo] = useState(Boolean(solicitud?.programa_manejo));
  const [tipoCertificado, setTipoCertificado] = useState(solicitud?.tipo_certificado || '');
  const [documentacion, setDocumentacion] = useState(Boolean(solicitud?.documentacion_en_probosque));
  const [declaratoria, setDeclaratoria] = useState(Boolean(solicitud?.declaratoria_sin_litigio));
  const [aviso, setAviso] = useState(Boolean(solicitud?.aviso_privacidad));
  const [refrendos, setRefrendos] = useState<Refrendo[]>(() => [2023, 2024, 2025].map((anio) => ({
    anio,
    folio: solicitud?.refrendos?.find((item) => item.anio === anio)?.folio || '',
  })));
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
      etiqueta,
      grupo,
      documentacion_en_probosque: documentacion,
      declaratoria_sin_litigio: declaratoria,
      aviso_privacidad: aviso,
      nombre_predio: nombrePredio,
      localidad,
      programa_manejo: programaManejo,
      tipo_certificado: tipoCertificado,
      refrendos,
      personas: personas
        .filter((persona) => persona.nombre.trim() && (carta || !CARTA.some((item) => item.papel === persona.papel)))
        .map((persona) => ({ ...persona, fecha_nacimiento: persona.fecha_nacimiento || null })),
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

  const titular = personas.find((fila) => fila.papel === 'titular') || personaVacia('titular');
  const segunda = personas.find((fila) => fila.papel === 'segunda') || personaVacia('segunda');
  const extras = (PAPELES[tipo] || []).filter((item) => item.papel !== 'titular' && item.papel !== 'segunda');
  const testigos = carta ? CARTA : [];
  const ponerArchivo = (clave: string, archivo: File | null) => setArchivos((mapa) => ({ ...mapa, [clave]: archivo }));
  const titulosPaso = [
    ['Refrendos', 'Si ya tuviste un folio en 2023, 2024 o 2025, anótalo. Si no, déjalo vacío. El programa es el de la convocatoria que abriste.'],
    ['Datos del solicitante', 'La etiqueta del formato elige el bloque. Propietario, Poseedor y Otro son persona física. Sociedad es persona jurídica. Núcleo Agrario abre el comisariado.'],
    ['Datos generales del predio', 'Proporciona la información de identificación, ubicación y superficies del predio a apoyar.'],
    ['Datos técnicos del programa', 'Solo aparece el archivo que pide el programa de esta convocatoria. El polígono ya quedó en el predio.'],
    ['Documentación de la persona', 'Lo piden las cinco convocatorias. El archivo propio de cada programa ya quedó en datos técnicos. La CLABE se pide al firmar.'],
    ['Declaraciones', 'La declaratoria y el aviso de privacidad se aceptan aquí.'],
    ['Revisión y envío de la solicitud', 'Verifica que la información capturada sea correcta antes de enviarla.'],
  ];

  if (!programa) {
    return (
      <div>
        <div className="page-heading">
          <IconoDocumento />
          <div>
            <h1>Solicitud de apoyo forestal</h1>
            <p className="subtitle">{convocatoria.titulo} incluye varios programas. Elige uno para abrir la solicitud. Dentro del formulario ya no se vuelve a preguntar.</p>
          </div>
        </div>
        <div className="acciones">
          {convocatoria.programas.map((item) => (
            <Link key={item.clave} className={accion} to={`/tramite/solicitudes/nueva?convocatoria=${convocatoria.id}&programa=${item.clave}`}>{item.nombre}</Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <IconoDocumento />
        <div>
          <h1>{editable ? 'Solicitud de apoyo forestal' : (nombrePredio || 'Solicitud')}</h1>
          <p className="subtitle">{editable ? 'Registro de solicitud para los programas de PROBOSQUE' : `${PROGRAMAS[programa] || programa} · ${municipio || 'Sin municipio'} · ${delegacion}`}</p>
        </div>
      </div>
      {editable ? (
        <div>
          {enCorreccion ? (
            <section className="bloque" style={{ marginBottom: 16 }}>
              <h2>Qué hay que corregir</h2>
              <p className="nota">{solicitud?.correccion || 'La delegación no escribió el detalle.'}</p>
              <p className="nota" style={{ marginTop: 8 }}>Fecha límite: {fechaDe(solicitud?.fecha_limite_subsanacion)}</p>
            </section>
          ) : null}
          <nav className="steps" aria-label="Progreso de la solicitud" style={{ ['--avance' as string]: paso }}>
            {PASOS.map((nombre, indice) => (
              <button key={nombre} type="button" className={indice === paso ? 'step active' : indice < paso ? 'step complete' : 'step'} onClick={() => setPaso(indice)}>
                <div className="step-circle">{indice < paso ? <Marca listo /> : indice + 1}</div>
                <span>{nombre}</span>
              </button>
            ))}
          </nav>
          <section className="form-card">
            <div className="form-inner">
              <div className="form-title">
                <span className="number">{paso + 1}</span>
                <div><h2>{titulosPaso[paso][0]}</h2><p>{titulosPaso[paso][1]}</p></div>
              </div>
              {paso === 0 ? (
                <div>
                  <p className="helper">{convocatoria.titulo}. {PROGRAMAS[programa] || programa}. El trámite es gratuito.</p>
                  <div className="name-fields">
                    {refrendos.map((item) => (
                      <Texto key={item.anio} etiqueta={`Folio de refrendo ${item.anio}`} valor={item.folio} placeholder="Si aplica" onChange={(valor) => setRefrendos(refrendos.map((fila) => fila.anio === item.anio ? { ...fila, folio: valor } : fila))} />
                    ))}
                  </div>
                  <label className="quality-option" style={{ marginTop: 18 }}>
                    <input type="checkbox" checked={documentacion} onChange={(evento) => setDocumentacion(evento.target.checked)} />
                    La documentación ya obra en PROBOSQUE y no pasa de tres años
                  </label>
                </div>
              ) : null}
              {paso === 1 ? (
                <div>
                  <div className="field-label">Etiqueta del formato <span className="required">*</span></div>
                  <div className="applicant-types" role="radiogroup">
                    {ETIQUETAS.map((item) => (
                      <label key={item.id} className="applicant-type">
                        <input type="radio" name="etiqueta" checked={etiqueta === item.id} onChange={() => { setEtiqueta(item.id); cambiarTipo(item.tipo); }} />
                        <span className="applicant-text"><strong>{item.nombre}</strong><small>{item.detalle}</small></span>
                      </label>
                    ))}
                  </div>
                  <div className="field-label">Grupo de quien solicita <span className="required">*</span></div>
                  <div className="quality-options">
                    {GRUPOS.map((item) => (
                      <label key={item.id} className="quality-option">
                        <input type="radio" name="grupo" checked={grupo === item.id} onChange={() => setGrupo(item.id)} />
                        {item.nombre}
                      </label>
                    ))}
                  </div>
                  <CamposPersona persona={titular} titulo={tipo === 'persona_fisica' ? 'Titular' : tipo === 'persona_juridica' ? 'Razón social' : 'Nombre del núcleo'} organizacion={tipo !== 'persona_fisica'} completa={tipo === 'persona_fisica'} onChange={(valor) => actualizar('titular', valor)} />
                  {extras.map((item) => {
                    const persona = personas.find((fila) => fila.papel === item.papel) || personaVacia(item.papel);
                    return <CamposPersona key={item.papel} persona={persona} titulo={item.etiqueta} organizacion={item.organizacion} completa={!item.organizacion} onChange={(valor) => actualizar(item.papel, valor)} />;
                  })}
                  <p className="field-label" style={{ marginTop: 22 }}>Segunda persona beneficiaria</p>
                  <p className="helper">Va en persona física, en sociedad y en el núcleo. En el núcleo es alguien del comisariado.</p>
                  <div className="name-fields">
                    <Texto etiqueta="Nombre(s)" valor={segunda.nombre} placeholder="Nombre" onChange={(valor) => actualizar('segunda', { ...segunda, nombre: valor })} />
                    <Texto etiqueta="Primer apellido" valor={segunda.primer_apellido} placeholder="Primer apellido" onChange={(valor) => actualizar('segunda', { ...segunda, primer_apellido: valor })} />
                    <Texto etiqueta="Segundo apellido" valor={segunda.segundo_apellido} placeholder="Segundo apellido" onChange={(valor) => actualizar('segunda', { ...segunda, segundo_apellido: valor })} />
                  </div>
                  {tipo === 'persona_fisica' ? (
                    <label className="quality-option" style={{ marginTop: 18 }}>
                      <input type="checkbox" checked={carta} onChange={(evento) => setCarta(evento.target.checked)} />
                      Hay representante con carta poder
                    </label>
                  ) : null}
                  {testigos.map((item) => {
                    const persona = personas.find((fila) => fila.papel === item.papel) || personaVacia(item.papel);
                    return <CamposPersona key={item.papel} persona={persona} titulo={item.etiqueta} completa onChange={(valor) => actualizar(item.papel, valor)} />;
                  })}
                </div>
              ) : null}
              {paso === 2 ? (
                <div>
                  <div className="part-heading"><strong>Identificación del predio</strong></div>
                  <div className="field-group">
                    <Texto etiqueta="Nombre del predio" valor={nombrePredio} placeholder="Ej. El Encinal" requerido onChange={setNombrePredio} />
                  </div>
                  <div className="field-row" style={{ marginTop: 14 }}>
                    <div className="field-group"><Texto etiqueta="Municipio" valor={municipio} placeholder="Municipio del predio" requerido onChange={setMunicipio} /></div>
                    <div className="field-group"><Texto etiqueta="Población o localidad" valor={localidad} placeholder="Ej. San Pedro" requerido onChange={setLocalidad} /></div>
                  </div>
                  <div className="field-group" style={{ marginTop: 14 }}>
                    <label className="field-label">Delegación que corresponde al municipio</label>
                    <select value={delegacion} onChange={(evento) => setDelegacion(evento.target.value)}>
                      {DELEGACIONES.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
                    </select>
                  </div>
                  <div className="part-heading"><strong>Polígono del predio</strong></div>
                  <p className="field-helper">Va en los cinco programas. La superficie sale del contorno. Márcalo en el mapa o sube el shapefile completo.</p>
                  <MapaPoligono className="mapa" vertices={vertices} onChange={setVertices} />
                  <div className="mapa-acciones">
                    <button type="button" className="btn btn-outline" onClick={() => setVertices((lista) => lista.slice(0, -1))}>Quitar último punto</button>
                    <BotonShapefile partes={partes} onPartes={setPartes} />
                  </div>
                  {solicitud?.tiene_poligono ? <p className="field-helper">Polígono guardado. Superficie: {solicitud.superficie_ha} ha.</p> : null}
                  <div className="part-heading"><strong>Programa de Manejo Forestal</strong></div>
                  <p className="field-label">¿El predio cuenta con Programa de Manejo Forestal (PMF)?</p>
                  <div className="radio-row">
                    <label><input type="radio" name="pmf" checked={programaManejo} onChange={() => setProgramaManejo(true)} /> Sí</label>
                    <label><input type="radio" name="pmf" checked={!programaManejo} onChange={() => setProgramaManejo(false)} /> No</label>
                  </div>
                  {programaManejo ? (
                    <div className="field-group" style={{ marginTop: 14 }}>
                      <Texto etiqueta="Tipo de certificado, si tiene" valor={tipoCertificado} placeholder="" onChange={setTipoCertificado} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {paso === 3 ? (
                <div>
                  <div className="part-heading"><strong>{PROGRAMAS[programa] || programa}</strong></div>
                  {(TECNICOS[programa] || []).length === 0 ? (
                    <p className="helper">PSAHEM no pide un archivo técnico al registrar. El pago se avisa con cheque.</p>
                  ) : (TECNICOS[programa] || []).map((item) => (
                    <FilaDoc key={item.clave} titulo={item.titulo} texto={item.texto} clave={item.clave} archivos={archivos} onArchivo={ponerArchivo} />
                  ))}
                </div>
              ) : null}
              {paso === 4 ? (
                <div>
                  <section className="doc-section">
                    <div className="doc-heading"><h3>Identificación del solicitante</h3></div>
                    <FilaDoc titulo="Identificación oficial vigente" texto="INE, cartilla militar, pasaporte, carta de naturalización o credencial del RAN." clave="identificacion:titular" archivos={archivos} onArchivo={ponerArchivo} requerido />
                    <FilaDoc titulo="CURP actualizada" texto="Va en todos los casos, aunque la identificación ya la traiga." clave="curp:titular" archivos={archivos} onArchivo={ponerArchivo} requerido />
                    <FilaDoc titulo="Comprobante de domicilio" texto="Recibo de luz, teléfono, agua, predial o cable, de no más de tres meses. Solo si la identificación no trae domicilio." clave="comprobante:titular" archivos={archivos} onArchivo={ponerArchivo} />
                  </section>
                  <section className="doc-section">
                    <div className="doc-heading"><h3>Acreditación del predio</h3></div>
                    <FilaDoc titulo="Documento de propiedad o posesión" texto="Núcleo agrario: carpeta básica, PHINA o ADDATE. Particular: escritura, título o constancia de posesión." clave="tenencia" archivos={archivos} onArchivo={ponerArchivo} requerido />
                  </section>
                  <section className="doc-section">
                    <div className="doc-heading"><h3>Documentación para ejidos y comunidades (si aplica)</h3></div>
                    <FilaDoc titulo="Acta de asamblea de incorporación al programa" texto="El núcleo autoriza destinar el predio al programa." clave="acta_predio" archivos={archivos} onArchivo={ponerArchivo} />
                    <FilaDoc titulo="Acta de elección vigente de los representantes" texto="Inscrita o presentada al RAN." clave="acta_eleccion" archivos={archivos} onArchivo={ponerArchivo} />
                  </section>
                  <section className="doc-section">
                    <div className="doc-heading"><h3>Si hay representante o es sociedad</h3></div>
                    <FilaDoc titulo="Carta poder" texto="Solo si hay representante. Original, con dos testigos y copia de las identificaciones." clave="carta_poder" archivos={archivos} onArchivo={ponerArchivo} />
                    <FilaDoc titulo="Acta constitutiva" texto="Solo si es sociedad. Escritura o estatutos con facultades de administración." clave="acta_constitutiva" archivos={archivos} onArchivo={ponerArchivo} />
                  </section>
                  <p className="docs-footnote">Los formatos FO se descargan de la convocatoria. El registro de plantación, el proyecto técnico y el certificado van en datos técnicos, según el programa.</p>
                </div>
              ) : null}
              {paso === 5 ? (
                <div className="declaration-list">
                  <label className="declaration-line">
                    <input type="checkbox" checked={declaratoria} onChange={(evento) => setDeclaratoria(evento.target.checked)} />
                    <span><strong>No litigio ni gravámenes.</strong> Manifiesto que el predio no presenta problemas de litigio ni condicionantes.</span>
                  </label>
                  <label className="declaration-line">
                    <input type="checkbox" checked={aviso} onChange={(evento) => setAviso(evento.target.checked)} />
                    <span><strong>Aviso de privacidad.</strong> Acepto el aviso y los derechos ARCO. El correo se guarda y los avisos se leen aquí.</span>
                  </label>
                </div>
              ) : null}
              {paso === 6 ? (
                <div className="review-grid">
                  <article className="review-card">
                    <div className="review-header"><h3>Refrendos</h3><button type="button" className="btn btn-outline" onClick={() => setPaso(0)}>Editar</button></div>
                    <div className="review-body"><dl>
                      <div className="review-row"><dt>Programa</dt><dd>{PROGRAMAS[programa] || programa}</dd></div>
                      <div className="review-row"><dt>Convocatoria</dt><dd>{convocatoria.titulo}</dd></div>
                      {refrendos.map((item) => (
                        <div key={item.anio} className="review-row"><dt>Folio {item.anio}</dt><dd>{item.folio || 'No aplica'}</dd></div>
                      ))}
                    </dl></div>
                  </article>
                  <article className="review-card">
                    <div className="review-header"><h3>Datos del solicitante</h3><button type="button" className="btn btn-outline" onClick={() => setPaso(1)}>Editar</button></div>
                    <div className="review-body"><dl>
                      <div className="review-row"><dt>Etiqueta</dt><dd>{etiqueta}</dd></div>
                      <div className="review-row"><dt>Nombre</dt><dd>{titular.nombre || '—'}</dd></div>
                      <div className="review-row"><dt>Grupo</dt><dd>{grupo}</dd></div>
                    </dl></div>
                  </article>
                  <article className="review-card">
                    <div className="review-header"><h3>Predio</h3><button type="button" className="btn btn-outline" onClick={() => setPaso(2)}>Editar</button></div>
                    <div className="review-body"><dl>
                      <div className="review-row"><dt>Nombre</dt><dd>{nombrePredio || '—'}</dd></div>
                      <div className="review-row"><dt>Municipio</dt><dd>{municipio || '—'}</dd></div>
                      <div className="review-row"><dt>Delegación</dt><dd>{delegacion}</dd></div>
                    </dl></div>
                  </article>
                  <article className="review-card">
                    <div className="review-header"><h3>Declaraciones</h3><button type="button" className="btn btn-outline" onClick={() => setPaso(5)}>Editar</button></div>
                    <div className="review-body"><dl>
                      <div className="review-row"><dt>Declaratoria</dt><dd>{declaratoria ? 'Aceptada' : 'Falta'}</dd></div>
                      <div className="review-row"><dt>Aviso</dt><dd>{aviso ? 'Aceptado' : 'Falta'}</dd></div>
                    </dl></div>
                  </article>
                </div>
              ) : null}
            </div>
            {error ? <p className="aviso">{error}</p> : null}
            <div className="footer">
              <div className="footer-left">
                <button type="button" className="btn btn-outline" disabled={paso === 0} onClick={() => setPaso(paso - 1)}>Anterior</button>
                <button type="button" className="btn btn-outline" disabled={ocupado} onClick={() => guardar(false)}>Guardar borrador</button>
              </div>
              {paso < 6 ? (
                <button type="button" className="btn btn-primary" onClick={() => setPaso(paso + 1)}>Siguiente</button>
              ) : (
                <button type="button" className="btn btn-primary" disabled={ocupado} onClick={() => guardar(true)}>Enviar</button>
              )}
            </div>
          </section>
        </div>
      ) : (
        <>
          {solicitud ? <Lectura solicitud={solicitud} convocatoria={convocatoria} /> : null}
          {solicitud && cuenta?.puesto === 'delegacion' ? <ComprobanteRecepcion solicitud={solicitud} onCambio={onCambio} /> : null}
          <p className="nota" style={{ marginTop: 16 }}>
            {solicitud?.estado === 'recibida'
              ? `Folio ${solicitud.folio}. La solicitud ya solo se consulta. El dictamen jurídico es otro paso y otro puesto.`
              : solicitud?.estado === 'subsanacion'
                ? 'La solicitud volvió a quien la envió. Ve el texto y la fecha límite en su expediente y en sus avisos.'
                : cuenta?.puesto === 'delegacion'
                  ? 'Guardar comprobante asigna el folio y deja la solicitud en solo consulta. No abre el dictamen. Pedir corrección la devuelve: hay que escribir qué se corrige y la fecha límite.'
                  : solicitud?.estado === 'enviada'
                    ? 'Esta solicitud ya fue enviada. La delegación todavía no le asigna folio.'
                    : convocatoria.lectura !== 'Recepción abierta'
                      ? 'La recepción no está abierta, así que no se puede aplicar.'
                      : 'Esta solicitud solo se consulta.'}
          </p>
        </>
      )}
    </div>
  );
}

function personasIniciales(solicitud: Solicitud | null, tipo: string) {
  return [...(PAPELES[tipo] || []), ...CARTA].map((item) => {
    const previa = solicitud?.personas.find((persona) => persona.papel === item.papel);
    return previa ? { ...personaVacia(item.papel), ...previa, fecha_nacimiento: previa.fecha_nacimiento || '' } : personaVacia(item.papel);
  });
}

function dato(valor?: string | null) {
  const limpio = (valor || '').trim();
  return limpio || '—';
}

function fechaDe(valor?: string | null) {
  const [anio, mes, dia] = (valor || '').slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '—';
}

function ComprobanteRecepcion({ solicitud, onCambio }: { solicitud: Solicitud; onCambio: (fila: Solicitud) => void }) {
  const cuenta = leerCuenta();
  const hoy = new Date().toISOString().slice(0, 10);
  const [folio, setFolio] = useState('');
  const [quien, setQuien] = useState(cuenta?.nombre || '');
  const [fecha, setFecha] = useState(hoy);
  const [observaciones, setObservaciones] = useState('');
  const [lugar, setLugar] = useState('');
  const [visita, setVisita] = useState('');
  const [correccion, setCorreccion] = useState('');
  const [limite, setLimite] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError('');
    setOcupado(true);
    try {
      onCambio(await apiTramite<Solicitud>(`/solicitudes/${solicitud.id}/comprobante`, {
        method: 'POST',
        body: JSON.stringify({
          folio,
          quien_recibio: quien,
          fecha_recepcion: fecha,
          observaciones,
          lugar_visita: lugar,
          fecha_visita: visita,
        }),
      }));
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo guardar el comprobante');
    } finally {
      setOcupado(false);
    }
  }

  async function devolver(evento: FormEvent) {
    evento.preventDefault();
    setError('');
    setOcupado(true);
    try {
      onCambio(await apiTramite<Solicitud>(`/solicitudes/${solicitud.id}/correccion`, {
        method: 'POST',
        body: JSON.stringify({ correccion, fecha_limite: limite }),
      }));
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo pedir la corrección');
    } finally {
      setOcupado(false);
    }
  }

  if (solicitud.estado === 'recibida') {
    return (
      <section className="bloque">
        <h2>Comprobante</h2>
        <div className="grupo">
          <p className="nota"><strong>Predio.</strong> {dato(solicitud.nombre_predio)}</p>
          <p className="nota"><strong>Municipio.</strong> {dato(solicitud.municipio)}</p>
          <p className="nota"><strong>Folio.</strong> {dato(solicitud.folio)}</p>
          <p className="nota"><strong>Quien recibe.</strong> {dato(solicitud.quien_recibio)}</p>
          <p className="nota"><strong>Fecha.</strong> {fechaDe(solicitud.fecha_recepcion)}</p>
          <p className="nota"><strong>Observaciones.</strong> {dato(solicitud.observaciones)}</p>
          <p className="nota"><strong>Lugar de la visita.</strong> {dato(solicitud.lugar_visita)}</p>
          <p className="nota"><strong>Fecha de la visita.</strong> {fechaDe(solicitud.fecha_visita)}</p>
        </div>
      </section>
    );
  }

  if (solicitud.estado === 'subsanacion') {
    return (
      <section className="bloque">
        <h2>Corrección pedida</h2>
        <p className="nota">{dato(solicitud.correccion)}</p>
        <p className="nota" style={{ marginTop: 8 }}>Fecha límite: {fechaDe(solicitud.fecha_limite_subsanacion)}</p>
      </section>
    );
  }

  if (solicitud.estado !== 'enviada') return null;

  return (
    <>
      <form className="bloque" onSubmit={guardar}>
        <h2>Comprobante</h2>
        <p className="nota">Al guardarlo se crea el folio y quien solicitó ya solo consulta. No abre el dictamen jurídico.</p>
        <div className="grupo" style={{ marginTop: 14 }}>
          <label className="campo">Predio<input value={solicitud.nombre_predio || '—'} readOnly /></label>
          <label className="campo">Municipio<input value={solicitud.municipio || '—'} readOnly /></label>
          <label className="campo">Folio<input value={folio} onChange={(evento) => setFolio(evento.target.value)} placeholder="Ej. PB-2026-014" required /></label>
          <label className="campo">Quien recibe<input value={quien} onChange={(evento) => setQuien(evento.target.value)} required /></label>
          <label className="campo">Fecha<input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required /></label>
          <label className="campo">Lugar de la visita<input value={lugar} onChange={(evento) => setLugar(evento.target.value)} placeholder="Oficina de la delegación" required /></label>
          <label className="campo">Fecha de la visita<input type="date" value={visita} onChange={(evento) => setVisita(evento.target.value)} required /></label>
          <label className="campo">Observaciones a los documentos<textarea value={observaciones} onChange={(evento) => setObservaciones(evento.target.value)} /></label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={ocupado} style={{ marginTop: 14 }}>Guardar comprobante</button>
      </form>
      <form className="bloque" onSubmit={devolver}>
        <h2>Pedir corrección</h2>
        <p className="nota">Devuelve la solicitud. No asigna folio. La fecha límite la escribes tú; el sitio no calcula los cinco días hábiles.</p>
        <div className="grupo" style={{ marginTop: 14 }}>
          <label className="campo">Qué se debe corregir<textarea value={correccion} onChange={(evento) => setCorreccion(evento.target.value)} required /></label>
          <label className="campo">Fecha límite<input type="date" value={limite} onChange={(evento) => setLimite(evento.target.value)} required /></label>
        </div>
        <button className="btn btn-outline" type="submit" disabled={ocupado} style={{ marginTop: 14 }}>Pedir corrección</button>
      </form>
      {error ? <p className="aviso" style={{ marginTop: 12 }}>{error}</p> : null}
    </>
  );
}

function FilaLectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="review-row"><dt>{etiqueta}</dt><dd>{valor}</dd></div>;
}

function etiquetaPapel(papel: string) {
  const conocido = [...PAPELES.persona_fisica, ...PAPELES.persona_juridica, ...PAPELES.nucleo_agrario, ...CARTA].find((item) => item.papel === papel);
  return conocido?.etiqueta || papel;
}

function esOrganizacion(papel: string) {
  const conocido = [...PAPELES.persona_juridica, ...PAPELES.nucleo_agrario].find((item) => item.papel === papel);
  return Boolean(conocido && 'organizacion' in conocido && conocido.organizacion);
}

function Lectura({ solicitud, convocatoria }: { solicitud: Solicitud; convocatoria: Convocatoria }) {
  const etiqueta = ETIQUETAS.find((item) => item.id === solicitud.etiqueta)?.nombre || dato(solicitud.etiqueta);
  const grupo = GRUPOS.find((item) => item.id === solicitud.grupo)?.nombre || dato(solicitud.grupo);
  const personas = solicitud.personas.filter((persona) => persona.nombre.trim());
  const tecnicos = new Set((TECNICOS[solicitud.programa] || []).map((item) => item.clave));
  return (
    <div className="review-grid">
      <article className="review-card">
        <div className="review-header"><h3>Programa y refrendos</h3></div>
        <div className="review-body"><dl>
          <FilaLectura etiqueta="Programa" valor={PROGRAMAS[solicitud.programa] || solicitud.programa} />
          <FilaLectura etiqueta="Convocatoria" valor={convocatoria.titulo} />
          <FilaLectura etiqueta="Estado" valor={solicitud.estado} />
          {(solicitud.refrendos || []).map((item) => (
            <FilaLectura key={item.anio} etiqueta={`Folio ${item.anio}`} valor={dato(item.folio)} />
          ))}
          <FilaLectura etiqueta="Documentación en PROBOSQUE" valor={solicitud.documentacion_en_probosque ? 'Sí, y no pasa de tres años' : 'No'} />
        </dl></div>
      </article>
      <article className="review-card">
        <div className="review-header"><h3>Solicitante</h3></div>
        <div className="review-body"><dl>
          <FilaLectura etiqueta="Etiqueta" valor={etiqueta} />
          <FilaLectura etiqueta="Grupo" valor={grupo} />
        </dl></div>
      </article>
      {personas.map((persona) => (
        <article key={persona.papel} className="review-card">
          <div className="review-header"><h3>{etiquetaPapel(persona.papel)}</h3></div>
          <div className="review-body"><dl>
            <FilaLectura etiqueta="Nombre" valor={dato([persona.nombre, persona.primer_apellido, persona.segundo_apellido].filter(Boolean).join(' '))} />
            {esOrganizacion(persona.papel) ? null : (
              <>
                <FilaLectura etiqueta="Nacimiento" valor={dato(persona.fecha_nacimiento)} />
                <FilaLectura etiqueta="CURP" valor={dato(persona.curp)} />
                <FilaLectura etiqueta="Folio de identificación" valor={dato(persona.folio_identificacion)} />
                <FilaLectura etiqueta="Celular" valor={dato(persona.celular)} />
                <FilaLectura etiqueta="Correo" valor={dato(persona.correo)} />
                <FilaLectura etiqueta="Teléfono fijo" valor={dato(persona.telefono_fijo)} />
                <FilaLectura etiqueta="Domicilio" valor={dato([persona.calle, persona.colonia, persona.codigo_postal].filter(Boolean).join(', '))} />
              </>
            )}
          </dl></div>
        </article>
      ))}
      <article className="review-card">
        <div className="review-header"><h3>Predio</h3></div>
        <div className="review-body"><dl>
          <FilaLectura etiqueta="Nombre" valor={dato(solicitud.nombre_predio)} />
          <FilaLectura etiqueta="Municipio" valor={dato(solicitud.municipio)} />
          <FilaLectura etiqueta="Localidad" valor={dato(solicitud.localidad)} />
          <FilaLectura etiqueta="Delegación" valor={dato(solicitud.delegacion)} />
          <FilaLectura etiqueta="Superficie" valor={solicitud.tiene_poligono ? `${solicitud.superficie_ha} ha` : 'Sin polígono'} />
          <FilaLectura etiqueta="Programa de manejo" valor={solicitud.programa_manejo ? (solicitud.tipo_certificado?.trim() || 'Sí, sin tipo de certificado') : 'No'} />
        </dl>
        {(solicitud.vertices || []).length >= 3 ? <MapaPoligono className="mapa" lectura vertices={solicitud.vertices || []} /> : <p className="helper">Sin polígono para dibujar.</p>}
        {solicitud.tiene_poligono ? (
          <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => abrirArchivo(`/api/tramite/v1/solicitudes/${solicitud.id}/shapefile`).catch(() => undefined)}>Descargar shapefile</button>
        ) : null}
        </div>
      </article>
      <article className="review-card">
        <div className="review-header"><h3>Datos técnicos y documentos</h3></div>
        <div className="review-body">
          {(TECNICOS[solicitud.programa] || []).length === 0 ? <p className="helper">Este programa no pide un archivo técnico al registrar.</p> : null}
          <div className="flex flex-wrap gap-2">
            {solicitud.archivos.map((archivo) => (
              <button key={archivo.id} type="button" className={secundario} onClick={() => abrirArchivo(`/api/tramite/v1/solicitudes/${solicitud.id}/archivos/${archivo.id}`)}>
                {tecnicos.has(archivo.clase) ? `${(TECNICOS[solicitud.programa] || []).find((item) => item.clave === archivo.clase)?.titulo || archivo.clase}: ${archivo.nombre}` : archivo.nombre}
              </button>
            ))}
          </div>
          {solicitud.archivos.length === 0 ? <p className="helper">No hay archivos.</p> : null}
        </div>
      </article>
      <article className="review-card">
        <div className="review-header"><h3>Declaraciones</h3></div>
        <div className="review-body"><dl>
          <FilaLectura etiqueta="Sin litigio" valor={solicitud.declaratoria_sin_litigio ? 'Aceptada' : 'No'} />
          <FilaLectura etiqueta="Aviso de privacidad" valor={solicitud.aviso_privacidad ? 'Aceptado' : 'No'} />
        </dl></div>
      </article>
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
