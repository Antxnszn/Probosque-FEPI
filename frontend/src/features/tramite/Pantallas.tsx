import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PROGRAMAS, PUESTOS, apiTramite, leerCuenta } from './cliente';
import { Cascaron } from './Cascaron';

type Fila = {
  id: number;
  programa: string;
  nombre_predio?: string;
  municipio: string;
  delegacion: string;
  estado: string;
  superficie_ha?: number | null;
  folio?: string;
  quien_recibio?: string;
  fecha_recepcion?: string | null;
  observaciones?: string;
  lugar_visita?: string;
  fecha_visita?: string | null;
  correccion?: string;
  fecha_limite_subsanacion?: string | null;
};

function fechaDe(valor?: string | null) {
  const [anio, mes, dia] = (valor || '').slice(0, 10).split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '—';
}

function nombreEstado(estado: string) {
  if (estado === 'enviada') return 'Enviada';
  if (estado === 'borrador') return 'Borrador';
  if (estado === 'recibida') return 'Recibida';
  if (estado === 'subsanacion') return 'En corrección';
  return estado;
}

export function ExpedienteSolicitante() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<Fila[]>('/solicitudes').then(setFilas).catch((causa) => setError(causa instanceof Error ? causa.message : 'No se pudo abrir el expediente'));
  }, []);

  const primera = filas[0];
  return (
    <Cascaron>
      <h1>{primera?.nombre_predio || 'Expediente'}</h1>
      {error ? <p className="aviso">{error}</p> : null}
      <section className="tabla"><table>
        <thead><tr><th>Programa</th><th>Estado</th><th>Folio</th><th>Superficie</th><th></th></tr></thead>
        <tbody>
          {filas.length === 0 ? <tr><td colSpan={5}>Todavía no hay solicitudes.</td></tr> : filas.map((fila) => (
            <tr key={fila.id}>
              <td>{PROGRAMAS[fila.programa] || fila.programa}</td>
              <td><span className="estado">{nombreEstado(fila.estado)}</span></td>
              <td>{fila.folio || 'Sin folio'}</td>
              <td>{fila.superficie_ha ? `${fila.superficie_ha} ha` : '—'}</td>
              <td><Link className="btn btn-outline" to={`/tramite/solicitudes/${fila.id}`}>Ver solicitud</Link></td>
            </tr>
          ))}
        </tbody>
      </table></section>
      <section className="bloque">
        <h2>Recepción</h2>
        <p className="nota">{textoRecepcion(primera)}</p>
      </section>
      <section className="bloque">
        <h2>Después</h2>
        <p className="nota">Dictámenes, resultado, contrato con metas, aviso de entrega y los documentos que subes tú y los que sube seguimiento. Quedan en este expediente.</p>
      </section>
    </Cascaron>
  );
}

function textoRecepcion(fila?: Fila) {
  if (!fila) return 'Cuando envíes la solicitud, la delegación escribe aquí el lugar y la fecha de la visita. La visita no se opera.';
  if (fila.estado === 'recibida') {
    return `Folio ${fila.folio || '—'}. Recibió ${fila.quien_recibio || '—'} el ${fechaDe(fila.fecha_recepcion)}. Revisión: ${fila.lugar_visita || 'sin lugar'}, ${fechaDe(fila.fecha_visita)}. ${fila.observaciones || 'Sin observaciones a los documentos.'} La visita no se opera.`;
  }
  if (fila.estado === 'subsanacion') return `Hay que corregir: ${fila.correccion || '—'}. Fecha límite: ${fechaDe(fila.fecha_limite_subsanacion)}.`;
  return `Delegación ${fila.delegacion}. ${fila.municipio}. Todavía no hay folio.`;
}

export function AvisosSolicitante() {
  const [filas, setFilas] = useState<Fila[]>([]);

  useEffect(() => {
    apiTramite<Fila[]>('/solicitudes').then(setFilas).catch(() => setFilas([]));
  }, []);

  const recibidas = filas.filter((fila) => fila.estado === 'recibida');
  const correcciones = filas.filter((fila) => fila.estado === 'subsanacion');
  return (
    <Cascaron>
      <h1>Avisos</h1>
      {recibidas.map((fila) => (
        <article key={`recepcion-${fila.id}`} className="card" style={{ marginBottom: 12 }}>
          <h2>Recepción</h2>
          <p>Folio {fila.folio || '—'}. Revisión del predio: {fila.lugar_visita || 'sin lugar'}, {fechaDe(fila.fecha_visita)}. La visita no se opera. No se manda por correo.</p>
        </article>
      ))}
      {correcciones.map((fila) => (
        <article key={`correccion-${fila.id}`} className="card" style={{ marginBottom: 12 }}>
          <h2>Corrección</h2>
          <p>{fila.correccion || 'La delegación pidió una corrección.'} Fecha límite: {fechaDe(fila.fecha_limite_subsanacion)}. No se manda por correo.</p>
        </article>
      ))}
      {['Recepción', 'Corrección', 'Visita de revisión', 'Resultado del comité', 'Contrato por firmar', 'Entrega ya realizada', 'Informe y cierre', 'Respuesta a la queja']
        .filter((nombre) => (nombre === 'Recepción' || nombre === 'Visita de revisión' ? recibidas.length === 0 : nombre === 'Corrección' ? correcciones.length === 0 : true))
        .map((nombre) => (
          <article key={nombre} className="card" style={{ marginBottom: 12 }}>
            <h2>{nombre}</h2>
            <p>Cuando exista, aparece en esta lista. No se manda por correo.</p>
          </article>
        ))}
    </Cascaron>
  );
}

export function QuejaSolicitante() {
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState('');

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!texto.trim()) {
      setAviso('Escribe qué ocurrió.');
      return;
    }
    setAviso('La queja se lee en el sistema. El registro de quejas todavía no está publicado en esta puerta.');
  }

  return (
    <Cascaron>
      <h1>Queja</h1>
      <form className="bloque" onSubmit={enviar}>
        <label className="campo">Qué ocurrió
          <textarea value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="La lee el Órgano de Control dentro del sistema." />
        </label>
        <button className="btn btn-primary" type="submit" style={{ marginTop: 12 }}>Enviar queja</button>
        {aviso ? <p className="nota" style={{ marginTop: 12 }}>{aviso}</p> : null}
        <p className="nota" style={{ marginTop: 12 }}>También puedes acudir por escrito al comité, a la Contraloría o a Denuncia EDOMÉX. Esos canales no se conectan a este sistema.</p>
      </form>
    </Cascaron>
  );
}

export function ResultadosConvocatoria() {
  return (
    <Cascaron>
      <h1>Resultados</h1>
      <p className="subtitle">La lista de personas beneficiarias se anexa a la convocatoria cuando el comité la marca.</p>
      <section className="bloque">
        <p className="nota">Desde aquí no se dictamina ni se paga. El PDF de la lista y la constancia de estrados se publican como resultado de la convocatoria.</p>
        <Link className="btn btn-outline" to="/tramite/convocatorias" style={{ marginTop: 12 }}>Ver convocatorias</Link>
      </section>
    </Cascaron>
  );
}

export function NuevaCuenta() {
  const cuenta = leerCuenta();
  const [delegaciones, setDelegaciones] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    apiTramite<string[]>('/delegaciones').then(setDelegaciones).catch(() => setDelegaciones([]));
  }, []);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario).entries());
    try {
      await apiTramite('/cuentas', { method: 'POST', body: JSON.stringify(datos) });
      formulario.reset();
      setAviso('La cuenta quedó creada.');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo crear la cuenta');
    }
  }

  if (!cuenta || cuenta.puesto !== 'super_admin') {
    return <Cascaron><p className="nota">Esta cuenta no administra las cuentas del personal.</p></Cascaron>;
  }

  return (
    <Cascaron>
      <Link className="btn btn-outline" to="/tramite">Volver</Link>
      <h1>Nueva cuenta</h1>
      <form className="bloque" onSubmit={crear}>
        <div className="grupo">
          <label className="campo">Nombre<input name="nombre" required /></label>
          <label className="campo">Correo<input name="correo" type="email" required placeholder="se guarda, no se envía" /></label>
          <label className="campo">Contraseña<input name="password" type="password" required minLength={8} placeholder="Al menos 8 caracteres" /></label>
          <label className="campo">Puesto
            <select name="puesto" defaultValue="convocatorias">
              {PUESTOS.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
            </select>
          </label>
          <label className="campo">Delegación, si el puesto es delegación
            <select name="delegacion" defaultValue="">
              <option value="">Sin delegación</option>
              {delegaciones.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
        </div>
        {error ? <p className="aviso">{error}</p> : null}
        {aviso ? <p className="nota">{aviso}</p> : null}
        <button className="btn btn-primary" type="submit" style={{ marginTop: 14 }}>Crear cuenta</button>
      </form>
    </Cascaron>
  );
}
