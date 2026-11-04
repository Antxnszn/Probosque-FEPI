import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapaPoligono } from './MapaPoligono';
import {
  PROGRAMAS,
  PUESTOS,
  TENENCIA,
  abrirArchivo,
  apiTramite,
  guardarCuenta,
  leerCuenta,
  type CuentaTramite,
} from './cliente';

const titulo = "font-['Outfit',sans-serif] text-4xl font-light tracking-tight";
const accion = 'rounded-full bg-[#E0643A] px-5 py-2.5 text-sm font-semibold text-white';
const campo = 'w-full border-b border-[#6B8B78]/40 bg-transparent py-2 focus:outline-none';

type Convocatoria = {
  id: number;
  programa: string;
  nombre_programa: string;
  titulo: string;
  texto: string;
  vigencia_inicio: string;
  vigencia_fin: string;
  estado: string;
  nombre_comite: string;
  ruta_pdf: string;
  documentos: string[];
};

type Solicitud = {
  id: number;
  cuenta_id: number;
  convocatoria_id: number;
  programa: string;
  nombre_solicitante: string;
  nombre_beneficiario: string;
  identificacion: string;
  representacion_legal: string;
  municipio: string;
  delegacion: string;
  estado: string;
  superficie_ha: number;
  folio: string;
  fecha_limite_subsanacion: string | null;
  tiene_poligono: boolean;
  documentos: { id: number; nombre: string }[];
};

function mensajeDe(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

export function InicioTramite() {
  const cuenta = leerCuenta();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria[]>('/convocatorias')
      .then(setConvocatorias)
      .catch((causa) => setError(mensajeDe(causa)));
    if (cuenta && cuenta.puesto !== 'fiduciaria' && cuenta.puesto !== 'uippe' && cuenta.puesto !== 'organo_control' && cuenta.puesto !== 'gestion_documental') {
      apiTramite<Solicitud[]>('/solicitudes').then(setSolicitudes).catch(() => setSolicitudes([]));
    }
  }, [cuenta?.id]);

  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#E0643A]">Trámite de apoyos</p>
        <h1 className={titulo}>Convocatorias y tu expediente</h1>
        <p className="max-w-2xl text-[#6B8B78]">
          {cuenta ? `${cuenta.nombre}, esta es la puerta del trámite.` : 'Entra con tu cuenta para solicitar o para trabajar un expediente.'}
        </p>
      </div>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      <div className="flex flex-wrap gap-6 text-sm">
        {!cuenta ? <Link className={accion} to="/tramite/entrar">Entrar</Link> : null}
        {cuenta?.clase === 'solicitante' ? <Link className="text-[#355044]" to="/tramite/solicitud/nueva">Nueva solicitud</Link> : null}
        {cuenta?.puesto === 'convocatorias' ? <Link className="text-[#355044]" to="/tramite/convocatoria/nueva">Nueva convocatoria</Link> : null}
        {cuenta?.puesto === 'convocatorias' ? <Link className="text-[#355044]" to="/tramite/personal">Cuentas de personal</Link> : null}
        {cuenta?.puesto === 'comite' ? <Link className="text-[#355044]" to="/tramite/lista-espera">Lista de espera</Link> : null}
        {cuenta?.puesto === 'uippe' ? <Link className="text-[#355044]" to="/tramite/indicadores">Indicadores</Link> : null}
        {cuenta?.puesto === 'gestion_documental' ? <Link className="text-[#355044]" to="/tramite/archivo">Archivo</Link> : null}
        {cuenta?.puesto === 'organo_control' ? <Link className="text-[#355044]" to="/tramite/quejas">Quejas</Link> : null}
        {cuenta?.puesto === 'fiduciaria' ? <Link className="text-[#355044]" to="/tramite/ministraciones">Ministraciones de PSAHEM</Link> : null}
      </div>
      <section className="space-y-4">
        <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Convocatorias</h2>
        {convocatorias.length === 0 ? <p className="text-[#6B8B78]">Todavía no hay convocatorias en esta vista.</p> : null}
        <div className="space-y-6">
          {convocatorias.map((fila) => (
            <article key={fila.id} className="space-y-1 border-t border-[#6B8B78]/20 pt-4">
              <p className="text-sm text-[#6B8B78]">{fila.nombre_programa} · {fila.estado}</p>
              <h3 className="text-xl">{fila.titulo}</h3>
              <p className="text-sm text-[#355044]">Vigencia {fila.vigencia_inicio} a {fila.vigencia_fin}</p>
              {fila.ruta_pdf ? <button type="button" className="text-sm text-[#E0643A]" onClick={() => abrirArchivo(`/api/tramite/v1/archivos/${fila.ruta_pdf}`)}>Ver el PDF</button> : null}
              {cuenta?.puesto === 'convocatorias' && fila.estado === 'borrador' ? (
                <button type="button" className="text-sm text-[#E0643A]" onClick={() => apiTramite(`/convocatorias/${fila.id}`, { method: 'PATCH', body: JSON.stringify({ estado: 'publicada' }) }).then(() => window.location.reload())}>
                  Publicar
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      {solicitudes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Expedientes</h2>
          {solicitudes.map((fila) => (
            <Link key={fila.id} to={`/tramite/solicitud/${fila.id}`} className="block border-t border-[#6B8B78]/20 pt-4">
              <span className="text-sm text-[#6B8B78]">{fila.folio || `Solicitud ${fila.id}`} · {PROGRAMAS[fila.programa] || fila.programa}</span>
              <span className="block">{fila.nombre_solicitante} · {fila.delegacion} · {fila.estado}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function EntrarTramite() {
  const navegar = useNavigate();
  const [clase, setClase] = useState<'solicitante' | 'personal'>('solicitante');
  const [alta, setAlta] = useState(false);
  const [error, setError] = useState('');
  const [delegaciones, setDelegaciones] = useState<string[]>([]);

  useEffect(() => {
    apiTramite<string[]>('/delegaciones').then(setDelegaciones).catch(() => setDelegaciones([]));
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    const datos = new FormData(evento.currentTarget);
    const cuerpo = Object.fromEntries(datos.entries());
    try {
      const ruta = alta
        ? clase === 'solicitante'
          ? '/cuentas/solicitante'
          : '/cuentas/personal'
        : '/sesion';
      const cuenta = await apiTramite<CuentaTramite>(ruta, {
        method: 'POST',
        body: JSON.stringify(alta ? cuerpo : { ...cuerpo, clase }),
      });
      if (!alta || clase === 'solicitante') {
        guardarCuenta(cuenta);
        navegar('/tramite');
      } else {
        setAlta(false);
        setError('La cuenta de personal quedó creada. Ahora entra con ella.');
      }
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  return (
    <form onSubmit={enviar} className="max-w-xl space-y-6">
      <h1 className={titulo}>{alta ? 'Crear cuenta' : 'Entrar al trámite'}</h1>
      <p className="text-[#6B8B78]">La cuenta de solicitante y la de personal son distintas. Si cumples los dos papeles, usas dos cuentas.</p>
      <div className="flex gap-4 text-sm">
        <button type="button" className={clase === 'solicitante' ? 'text-[#E0643A]' : 'text-[#355044]'} onClick={() => setClase('solicitante')}>Solicitante</button>
        <button type="button" className={clase === 'personal' ? 'text-[#E0643A]' : 'text-[#355044]'} onClick={() => setClase('personal')}>Personal</button>
      </div>
      {alta ? <input name="nombre" required className={campo} placeholder="Nombre" /> : null}
      <label className="block text-sm">Correo<input name="correo" type="email" required className={campo} /></label>
      <label className="block text-sm">Contraseña<input name="password" type="password" required minLength={8} className={campo} /></label>
      {alta && clase === 'personal' ? (
        <>
          <label className="block text-sm">Puesto
            <select name="puesto" className={campo} defaultValue="convocatorias">
              {PUESTOS.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm">Delegación, solo si el puesto es delegación
            <select name="delegacion" className={campo} defaultValue="">
              <option value="">Sin delegación</option>
              {delegaciones.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
        </>
      ) : null}
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      <button className={accion} type="submit">{alta ? 'Crear' : 'Entrar'}</button>
      <button type="button" className="block text-sm text-[#355044]" onClick={() => setAlta((valor) => !valor)}>
        {alta ? 'Ya tengo cuenta' : 'Crear una cuenta'}
      </button>
    </form>
  );
}

export function NuevaConvocatoria() {
  const navegar = useNavigate();
  const [error, setError] = useState('');

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const archivo = datos.get('pdf');
    datos.delete('pdf');
    const documentos = String(datos.get('documentos') || '').split('\n').map((linea) => linea.trim()).filter(Boolean);
    const cuerpo = {
      programa: datos.get('programa'),
      titulo: datos.get('titulo'),
      texto: datos.get('texto'),
      vigencia_inicio: datos.get('vigencia_inicio'),
      vigencia_fin: datos.get('vigencia_fin'),
      nombre_comite: datos.get('nombre_comite'),
      documentos,
    };
    try {
      const creada = await apiTramite<Convocatoria>('/convocatorias', { method: 'POST', body: JSON.stringify(cuerpo) });
      if (archivo instanceof File && archivo.size > 0) {
        const forma = new FormData();
        forma.append('archivo', archivo);
        await apiTramite(`/convocatorias/${creada.id}/pdf`, { method: 'POST', body: forma });
      }
      navegar('/tramite');
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  return (
    <form onSubmit={enviar} className="max-w-xl space-y-5">
      <h1 className={titulo}>Nueva convocatoria</h1>
      <select name="programa" className={campo}>{Object.entries(PROGRAMAS).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}</select>
      <input name="titulo" required placeholder="Título" className={campo} />
      <textarea name="texto" rows={4} placeholder="Texto de la convocatoria" className={campo} />
      <label className="block text-sm">Inicio<input name="vigencia_inicio" type="date" required className={campo} /></label>
      <label className="block text-sm">Cierre<input name="vigencia_fin" type="date" required className={campo} /></label>
      <input name="nombre_comite" placeholder="Nombre del comité, si ya lo tienes" className={campo} />
      <textarea name="documentos" rows={4} placeholder="Un documento por línea" className={campo} />
      <label className="block text-sm">PDF<input name="pdf" type="file" accept="application/pdf" /></label>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      <button className={accion} type="submit">Guardar borrador</button>
    </form>
  );
}

export function NuevaSolicitud() {
  const navegar = useNavigate();
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [delegaciones, setDelegaciones] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Convocatoria[]>('/convocatorias').then(setConvocatorias).catch((causa) => setError(mensajeDe(causa)));
    apiTramite<string[]>('/delegaciones').then(setDelegaciones).catch(() => setDelegaciones([]));
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = Object.fromEntries(new FormData(evento.currentTarget).entries());
    try {
      const creada = await apiTramite<Solicitud>('/solicitudes', {
        method: 'POST',
        body: JSON.stringify({ ...datos, convocatoria_id: Number(datos.convocatoria_id) }),
      });
      navegar(`/tramite/solicitud/${creada.id}`);
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  return (
    <form onSubmit={enviar} className="max-w-xl space-y-5">
      <h1 className={titulo}>Nueva solicitud</h1>
      <select name="convocatoria_id" required className={campo}>
        {convocatorias.map((fila) => <option key={fila.id} value={fila.id}>{fila.titulo}</option>)}
      </select>
      <input name="nombre_solicitante" required placeholder="Nombre de quien solicita" className={campo} />
      <input name="nombre_beneficiario" placeholder="Nombre de la persona beneficiaria" className={campo} />
      <input name="identificacion" placeholder="Identificación" className={campo} />
      <input name="representacion_legal" placeholder="Representación legal" className={campo} />
      <input name="municipio" placeholder="Municipio" className={campo} />
      <select name="delegacion" required className={campo}>
        {delegaciones.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
      </select>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      <button className={accion} type="submit">Abrir solicitud</button>
    </form>
  );
}

export function SolicitudTramite() {
  const { id = '' } = useParams();
  const cuenta = leerCuenta();
  const [expediente, setExpediente] = useState<{ solicitud: Solicitud; dictamen: any; formalizacion: any; cierre: any } | null>(null);
  const [vertices, setVertices] = useState<{ lat: number; lng: number }[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function cargar() {
    const cuerpo = await apiTramite<typeof expediente>(`/solicitudes/${id}`);
    setExpediente(cuerpo);
  }

  useEffect(() => {
    cargar().catch((causa) => setError(mensajeDe(causa)));
    const clave = `fepi_tramite_poligono_${id}`;
    const enviarPendiente = () => {
      const pendiente = localStorage.getItem(clave);
      if (!pendiente || !navigator.onLine) return;
      apiTramite(`/solicitudes/${id}/poligono`, { method: 'POST', body: pendiente })
        .then(() => {
          localStorage.removeItem(clave);
          return cargar();
        })
        .catch(() => setAviso('El polígono sigue guardado en este navegador y se enviará cuando vuelva la red.'));
    };
    window.addEventListener('online', enviarPendiente);
    enviarPendiente();
    return () => window.removeEventListener('online', enviarPendiente);
  }, [id]);

  async function correr(ruta: string, opciones?: RequestInit) {
    setError('');
    try {
      await apiTramite(ruta, opciones);
      setAviso('Quedó registrado.');
      await cargar();
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  async function guardarPoligono() {
    const cuerpo = JSON.stringify({ vertices });
    if (!navigator.onLine) {
      localStorage.setItem(`fepi_tramite_poligono_${id}`, cuerpo);
      setAviso('Sin red. El polígono quedó en este navegador y se enviará al volver.');
      return;
    }
    await correr(`/solicitudes/${id}/poligono`, { method: 'POST', body: cuerpo });
  }

  if (!expediente) return <p className="text-[#6B8B78]">{error || 'Cargando el expediente.'}</p>;
  const solicitud = expediente.solicitud;
  const editable = cuenta?.clase === 'solicitante' && (solicitud.estado === 'borrador' || solicitud.estado === 'subsanacion');
  const ultima = expediente.dictamen.resoluciones.at(-1);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-[#E0643A]">{solicitud.folio || `Solicitud ${solicitud.id}`}</p>
        <h1 className={titulo}>{solicitud.nombre_solicitante}</h1>
        <p className="text-[#6B8B78]">{PROGRAMAS[solicitud.programa] || solicitud.programa} · {solicitud.delegacion} · {solicitud.municipio} · {solicitud.estado}</p>
        {solicitud.fecha_limite_subsanacion ? <p>Fecha límite de subsanación: {solicitud.fecha_limite_subsanacion}</p> : null}
        <p>Superficie del dibujo: {solicitud.superficie_ha} ha</p>
      </div>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {aviso ? <p className="text-[#355044]">{aviso}</p> : null}

      {editable ? (
        <section className="space-y-4">
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Predio</h2>
          <p className="text-sm text-[#6B8B78]">Haz clic en el mapa para marcar los vértices. El sistema guarda el shapefile.</p>
          <MapaPoligono vertices={vertices} onChange={setVertices} />
          <button type="button" className={accion} onClick={guardarPoligono}>Guardar polígono</button>
          <button type="button" className="text-sm text-[#355044]" onClick={() => setVertices([])}>Borrar vértices</button>
          <form className="space-y-3" onSubmit={(evento) => {
            evento.preventDefault();
            const datos = new FormData(evento.currentTarget);
            correr(`/solicitudes/${id}/shapefile`, { method: 'POST', body: datos });
          }}>
            <p className="text-sm">O sube el shapefile que ya tienes: .shp, .shx, .dbf y .prj.</p>
            <input name="shp" type="file" required />
            <input name="shx" type="file" required />
            <input name="dbf" type="file" required />
            <input name="prj" type="file" required />
            <button className="text-sm text-[#E0643A]" type="submit">Subir shapefile</button>
          </form>
          <form className="space-y-3" onSubmit={(evento) => {
            evento.preventDefault();
            const datos = new FormData(evento.currentTarget);
            correr(`/solicitudes/${id}/documentos`, { method: 'POST', body: datos });
          }}>
            <input name="nombre" required placeholder={`Documento, por ejemplo ${TENENCIA}`} className={campo} />
            <input name="archivo" type="file" required />
            <button className="text-sm text-[#E0643A]" type="submit">Subir documento</button>
          </form>
          <button type="button" className={accion} onClick={() => correr(`/solicitudes/${id}/enviar`, { method: 'POST' })}>Enviar solicitud</button>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Documentos</h2>
        {solicitud.documentos.map((documento) => (
          <button key={documento.id} type="button" className="block text-[#355044]" onClick={() => abrirArchivo(`/api/tramite/v1/documentos/${documento.id}`)}>{documento.nombre}</button>
        ))}
      </section>

      {cuenta?.puesto === 'delegacion' && solicitud.estado === 'enviada' ? (
        <div className="flex flex-wrap gap-4">
          <button type="button" className={accion} onClick={() => correr(`/solicitudes/${id}/recibir`, { method: 'POST' })}>Recibir y asignar folio</button>
          <form className="flex gap-3" onSubmit={(evento) => {
            evento.preventDefault();
            const fecha = new FormData(evento.currentTarget).get('fecha_limite_subsanacion');
            correr(`/solicitudes/${id}/subsanar`, { method: 'POST', body: JSON.stringify({ fecha_limite_subsanacion: fecha }) });
          }}>
            <input name="fecha_limite_subsanacion" type="date" required className={campo} />
            <button className="text-sm text-[#E0643A]" type="submit">Pedir corrección</button>
          </form>
        </div>
      ) : null}
      {cuenta?.puesto === 'delegacion' && solicitud.estado === 'recibida' ? (
        <button type="button" className={accion} onClick={() => correr(`/solicitudes/${id}/remitir`, { method: 'POST' })}>Remitir a dictamen</button>
      ) : null}
      {cuenta?.puesto === 'unidad_juridica' && solicitud.estado === 'remitida' ? <DictamenForma ruta={`/solicitudes/${id}/dictamen-juridico`} alListo={correr} /> : null}
      {cuenta?.puesto === 'area_tecnica' && solicitud.estado === 'dictaminada_juridico' ? <DictamenForma ruta={`/solicitudes/${id}/dictamen-tecnico`} alListo={correr} /> : null}
      {cuenta?.puesto === 'comite' && ['dictaminada_juridico', 'dictaminada_tecnico', 'resuelta'].includes(solicitud.estado) ? (
        <form className="space-y-3" onSubmit={(evento) => {
          evento.preventDefault();
          const datos = Object.fromEntries(new FormData(evento.currentTarget).entries());
          correr(`/solicitudes/${id}/resolucion`, { method: 'POST', body: JSON.stringify(datos) });
        }}>
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Resolución del comité</h2>
          <select name="resultado" className={campo}>
            <option value="beneficiario">Beneficiario</option>
            <option value="lista_espera">Lista de espera</option>
            <option value="fuera">Fuera del programa</option>
          </select>
          <textarea name="texto" className={campo} placeholder="Texto de la resolución" />
          <button className={accion} type="submit">Registrar resolución</button>
        </form>
      ) : null}
      {cuenta?.puesto === 'administracion_finanzas' && solicitud.estado === 'resuelta' && ultima?.resultado === 'beneficiario' ? (
        <form className="space-y-3" onSubmit={(evento) => {
          evento.preventDefault();
          correr(`/solicitudes/${id}/contrato`, { method: 'POST', body: new FormData(evento.currentTarget) });
        }}>
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Contrato</h2>
          <textarea name="texto_compromisos" className={campo} placeholder="Compromisos" />
          <input name="archivo" type="file" />
          <button className={accion} type="submit">Registrar contrato</button>
        </form>
      ) : null}
      {cuenta?.puesto === 'administracion_finanzas' && ['formalizada', 'seguimiento'].includes(solicitud.estado) ? (
        <form className="space-y-3" onSubmit={(evento) => {
          evento.preventDefault();
          correr(`/solicitudes/${id}/ministracion`, { method: 'POST', body: new FormData(evento.currentTarget) });
        }}>
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Ministración</h2>
          <input name="fecha" type="date" required className={campo} />
          <input name="tipo_apoyo" required placeholder="Tipo de apoyo" className={campo} />
          <input name="monto" required placeholder="Monto" className={campo} />
          <input name="archivo" type="file" />
          <button className={accion} type="submit">Registrar ministración</button>
        </form>
      ) : null}
      {cuenta?.puesto === 'seguimiento' && ['formalizada', 'seguimiento'].includes(solicitud.estado) ? (
        <div className="space-y-6">
          <form className="space-y-3" onSubmit={(evento) => {
            evento.preventDefault();
            correr(`/solicitudes/${id}/seguimiento`, { method: 'POST', body: new FormData(evento.currentTarget) });
          }}>
            <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Seguimiento</h2>
            <input name="nombre" required placeholder="Nombre del documento" className={campo} />
            <input name="archivo" type="file" required />
            <button className="text-sm text-[#E0643A]" type="submit">Agregar documento</button>
          </form>
          <button type="button" className="text-sm text-[#355044]" onClick={() => correr(`/solicitudes/${id}/informe/aprobar`, { method: 'POST' })}>Aprobar informe</button>
          <form className="space-y-3" onSubmit={(evento) => {
            evento.preventDefault();
            const datos = Object.fromEntries(new FormData(evento.currentTarget).entries());
            correr(`/solicitudes/${id}/cierre`, { method: 'POST', body: JSON.stringify(datos) });
          }}>
            <select name="tipo" className={campo}>
              <option value="cierre">Cierre</option>
              <option value="terminacion">Terminación</option>
              <option value="reintegro">Reintegro</option>
            </select>
            <textarea name="texto" className={campo} placeholder="Nota del cierre" />
            <button className={accion} type="submit">Cerrar y armar archivo</button>
          </form>
        </div>
      ) : null}
      {cuenta?.clase === 'solicitante' && ['formalizada', 'seguimiento'].includes(solicitud.estado) ? (
        <form className="space-y-3" onSubmit={(evento) => {
          evento.preventDefault();
          correr(`/solicitudes/${id}/informe`, { method: 'POST', body: new FormData(evento.currentTarget) });
        }}>
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Informe final</h2>
          <textarea name="texto" className={campo} />
          <input name="archivo" type="file" />
          <button className={accion} type="submit">Enviar informe</button>
        </form>
      ) : null}
      {cuenta?.clase === 'solicitante' ? (
        <form className="space-y-3" onSubmit={(evento) => {
          evento.preventDefault();
          const texto = new FormData(evento.currentTarget).get('texto');
          correr('/quejas', { method: 'POST', body: JSON.stringify({ solicitud_id: Number(id), texto }) });
        }}>
          <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Queja</h2>
          <textarea name="texto" required className={campo} />
          <button className="text-sm text-[#E0643A]" type="submit">Presentar queja</button>
        </form>
      ) : null}

      <Hechos expediente={expediente} />
    </div>
  );
}

function DictamenForma({ ruta, alListo }: { ruta: string; alListo: (ruta: string, opciones?: RequestInit) => Promise<void> }) {
  return (
    <form className="space-y-3" onSubmit={(evento) => {
      evento.preventDefault();
      alListo(ruta, { method: 'POST', body: new FormData(evento.currentTarget) });
    }}>
      <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Dictamen</h2>
      <select name="procede" className={campo}>
        <option value="true">Procede</option>
        <option value="false">No procede</option>
      </select>
      <textarea name="texto" className={campo} placeholder="Texto del dictamen" />
      <input name="archivo" type="file" />
      <button className={accion} type="submit">Registrar dictamen</button>
    </form>
  );
}

function Hechos({ expediente }: { expediente: { dictamen: any; formalizacion: any; cierre: any } }) {
  return (
    <section className="space-y-3 text-sm text-[#355044]">
      <h2 className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24]">Lo registrado</h2>
      {expediente.dictamen.juridico ? <p>Dictamen jurídico: {expediente.dictamen.juridico.procede ? 'procede' : 'no procede'}. {expediente.dictamen.juridico.texto}</p> : null}
      {expediente.dictamen.tecnico ? <p>Dictamen técnico: {expediente.dictamen.tecnico.procede ? 'procede' : 'no procede'}. {expediente.dictamen.tecnico.texto}</p> : null}
      {expediente.dictamen.resoluciones.map((fila: { id: number; resultado: string; texto: string }) => (
        <p key={fila.id}>Resolución: {fila.resultado}. {fila.texto}</p>
      ))}
      {expediente.formalizacion.contrato ? <p>Contrato: {expediente.formalizacion.contrato.texto_compromisos}</p> : null}
      {expediente.formalizacion.ministraciones.map((fila: { id: number; fecha: string; tipo_apoyo: string; monto: string }) => (
        <p key={fila.id}>Ministración {fila.fecha}: {fila.tipo_apoyo}, {fila.monto}</p>
      ))}
      {expediente.formalizacion.informe ? <p>Informe {expediente.formalizacion.informe.estado}: {expediente.formalizacion.informe.texto}</p> : null}
      {expediente.cierre.cierre ? <p>Cierre {expediente.cierre.cierre.tipo}: {expediente.cierre.cierre.texto}</p> : null}
      {expediente.cierre.archivo ? <p className="whitespace-pre-wrap">{expediente.cierre.archivo.resumen}</p> : null}
      {expediente.cierre.quejas.map((fila: { id: number; texto: string; respuesta: string }) => (
        <p key={fila.id}>Queja: {fila.texto} {fila.respuesta ? `Respuesta: ${fila.respuesta}` : ''}</p>
      ))}
    </section>
  );
}

export function AvisosTramite() {
  const [avisos, setAvisos] = useState<{ id: number; texto: string; leido: boolean }[]>([]);
  useEffect(() => {
    apiTramite<typeof avisos>('/avisos').then(setAvisos).catch(() => setAvisos([]));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className={titulo}>Avisos</h1>
      {avisos.map((aviso) => (
        <button key={aviso.id} type="button" className="block text-left" onClick={() => apiTramite(`/avisos/${aviso.id}/leido`, { method: 'POST' }).then(() => setAvisos((filas) => filas.map((fila) => fila.id === aviso.id ? { ...fila, leido: true } : fila)))}>
          <span className={aviso.leido ? 'text-[#6B8B78]' : 'text-[#1B2A24]'}>{aviso.texto}</span>
        </button>
      ))}
    </div>
  );
}

export function ListaEspera() {
  const [filas, setFilas] = useState<{ id: number; solicitud_id: number; programa: string; texto: string }[]>([]);
  useEffect(() => { apiTramite<typeof filas>('/lista-espera').then(setFilas).catch(() => setFilas([])); }, []);
  return (
    <div className="space-y-4">
      <h1 className={titulo}>Lista de espera</h1>
      {filas.map((fila) => <Link key={fila.id} to={`/tramite/solicitud/${fila.solicitud_id}`} className="block">{PROGRAMAS[fila.programa] || fila.programa} · solicitud {fila.solicitud_id}</Link>)}
    </div>
  );
}

export function IndicadoresTramite() {
  const [datos, setDatos] = useState<{ solicitudes: { programa: string; estado: string; total: number }[]; resoluciones: { programa: string; resultado: string; total: number }[]; cierres: { programa: string; tipo: string; total: number }[] } | null>(null);
  useEffect(() => { apiTramite<typeof datos>('/indicadores').then(setDatos).catch(() => setDatos(null)); }, []);
  if (!datos) return <p className="text-[#6B8B78]">Cargando indicadores.</p>;
  return (
    <div className="space-y-8">
      <h1 className={titulo}>Indicadores</h1>
      <div className="flex flex-wrap gap-8">
        {datos.solicitudes.map((fila) => <Dato key={`${fila.programa}${fila.estado}`} valor={fila.total} texto={`${PROGRAMAS[fila.programa] || fila.programa}, ${fila.estado}`} />)}
        {datos.resoluciones.map((fila) => <Dato key={`${fila.programa}${fila.resultado}`} valor={fila.total} texto={`${fila.programa}, ${fila.resultado}`} />)}
        {datos.cierres.map((fila) => <Dato key={`${fila.programa}${fila.tipo}`} valor={fila.total} texto={`${fila.programa}, ${fila.tipo}`} />)}
      </div>
    </div>
  );
}

function Dato({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div>
      <div className="font-['Outfit',sans-serif] text-4xl font-light tabular-nums text-[#355044]">{valor}</div>
      <p className="max-w-[180px] text-sm text-[#6B8B78]">{texto}</p>
    </div>
  );
}

export function ArchivoTramite() {
  const [filas, setFilas] = useState<{ id: number; solicitud_id: number; programa: string; resumen: string }[]>([]);
  useEffect(() => { apiTramite<typeof filas>('/archivo').then(setFilas).catch(() => setFilas([])); }, []);
  return (
    <div className="space-y-6">
      <h1 className={titulo}>Archivo</h1>
      {filas.map((fila) => (
        <article key={fila.id} className="space-y-2 border-t border-[#6B8B78]/20 pt-4">
          <Link to={`/tramite/solicitud/${fila.solicitud_id}`}>{PROGRAMAS[fila.programa] || fila.programa} · solicitud {fila.solicitud_id}</Link>
          <p className="whitespace-pre-wrap text-sm text-[#355044]">{fila.resumen}</p>
        </article>
      ))}
    </div>
  );
}

export function QuejasTramite() {
  const [filas, setFilas] = useState<{ id: number; solicitud_id: number; texto: string; respuesta: string }[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { apiTramite<typeof filas>('/quejas').then(setFilas).catch((causa) => setError(mensajeDe(causa))); }, []);
  return (
    <div className="space-y-6">
      <h1 className={titulo}>Quejas</h1>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {filas.map((fila) => (
        <form key={fila.id} className="space-y-2 border-t border-[#6B8B78]/20 pt-4" onSubmit={(evento) => {
          evento.preventDefault();
          const respuesta = new FormData(evento.currentTarget).get('respuesta');
          apiTramite(`/quejas/${fila.id}/atencion`, { method: 'POST', body: JSON.stringify({ respuesta }) }).then(() => window.location.reload()).catch((causa) => setError(mensajeDe(causa)));
        }}>
          <p>Solicitud {fila.solicitud_id}: {fila.texto}</p>
          {fila.respuesta ? <p className="text-[#6B8B78]">Respuesta: {fila.respuesta}</p> : <><textarea name="respuesta" required className={campo} /><button className={accion} type="submit">Registrar atención</button></>}
        </form>
      ))}
    </div>
  );
}

export function MinistracionesTramite() {
  const [filas, setFilas] = useState<{ id: number; solicitud_id: number; programa: string; fecha: string; tipo_apoyo: string; monto: string }[]>([]);
  useEffect(() => { apiTramite<typeof filas>('/ministraciones').then(setFilas).catch(() => setFilas([])); }, []);
  return (
    <div className="space-y-4">
      <h1 className={titulo}>Ministraciones</h1>
      {filas.map((fila) => <p key={fila.id}>{fila.fecha} · {PROGRAMAS[fila.programa] || fila.programa} · solicitud {fila.solicitud_id} · {fila.tipo_apoyo} · {fila.monto}</p>)}
    </div>
  );
}

export function PersonalNuevo() {
  const [delegaciones, setDelegaciones] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  useEffect(() => { apiTramite<string[]>('/delegaciones').then(setDelegaciones).catch(() => setDelegaciones([])); }, []);
  return (
    <form className="max-w-xl space-y-4" onSubmit={(evento) => {
      evento.preventDefault();
      const cuerpo = Object.fromEntries(new FormData(evento.currentTarget).entries());
      apiTramite('/cuentas/personal/autorizada', { method: 'POST', body: JSON.stringify(cuerpo) })
        .then(() => setAviso('La cuenta quedó creada.'))
        .catch((causa) => setError(mensajeDe(causa)));
    }}>
      <h1 className={titulo}>Cuenta de personal</h1>
      <input name="nombre" required className={campo} placeholder="Nombre" />
      <input name="correo" type="email" required className={campo} placeholder="Correo" />
      <input name="password" type="password" required minLength={8} className={campo} placeholder="Contraseña" />
      <select name="puesto" className={campo}>{PUESTOS.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}</select>
      <select name="delegacion" className={campo}><option value="">Sin delegación</option>{delegaciones.map((nombre) => <option key={nombre}>{nombre}</option>)}</select>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {aviso ? <p>{aviso}</p> : null}
      <button className={accion} type="submit">Crear cuenta</button>
    </form>
  );
}
