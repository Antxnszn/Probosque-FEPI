import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  PROGRAMAS,
  PUESTOS,
  apiTramite,
  guardarCuenta,
  leerCuenta,
  type CuentaTramite,
} from './cliente';
import { ListaPublica } from './Convocatorias';
import { TablaConvocatoriasAuditoria, TablaSolicitudes, type Solicitud } from './Solicitudes';
import { Cascaron, accion, campo, secundario } from './Cascaron';

const celda = 'w-full min-w-40 rounded-lg border border-[#D3D9E1] bg-white px-3 py-2 text-sm text-[#111827]';
const POR_PAGINA = 5;

type Personal = {
  id: number;
  nombre: string;
  correo: string;
  puesto: string | null;
  delegacion: string | null;
  activo: boolean;
};

function mensajeDe(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}

function nombrePuesto(puesto: string | null) {
  if (puesto === 'super_admin') return 'Super admin';
  return PUESTOS.find((fila) => fila.id === puesto)?.nombre || puesto || 'Personal';
}

export function PuertaCuentas() {
  const [cuenta, setCuenta] = useState<CuentaTramite | null>(leerCuenta());
  const [vista, setVista] = useState<'puerta' | 'solicitante' | 'personal' | 'arranque'>('puerta');
  const [alta, setAlta] = useState(true);
  const [haySuper, setHaySuper] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiTramite<{ hay_super_admin: boolean }>('/arranque')
      .then((cuerpo) => setHaySuper(cuerpo.hay_super_admin))
      .catch(() => setHaySuper(true));
  }, []);

  function entrar(siguiente: CuentaTramite) {
    guardarCuenta(siguiente);
    setCuenta(siguiente);
    setError('');
  }

  return (
    <Cascaron publico={!cuenta}>
        {cuenta ? (
          <Sesion cuenta={cuenta} />
        ) : vista === 'puerta' ? (
          <>
            <h1>Elige cómo entras</h1>
            <div className="rejilla">
              <button type="button" className="card" onClick={() => { setVista('solicitante'); setAlta(true); setError(''); }}>
                <h2>Soy solicitante</h2>
                <p>Creo mi cuenta con nombre, correo y contraseña de al menos ocho caracteres. Solo veo mi expediente.</p>
              </button>
              <button type="button" className="card" onClick={() => { setVista('personal'); setError(''); }}>
                <h2>Soy personal</h2>
                <p>Entro con la cuenta que me dio la cuenta de arranque. El puesto no se elige aquí.</p>
              </button>
              {!haySuper ? (
                <button type="button" className="card" onClick={() => { setVista('arranque'); setError(''); }}>
                  <h2>Cuenta de arranque</h2>
                  <p>Crea al personal. No recibe, no dictamina, no publica y no paga. Solo se crea una vez.</p>
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <Formulario
            vista={vista}
            alta={alta}
            error={error}
            onError={setError}
            onAlta={() => setAlta((valor) => !valor)}
            onVolver={() => { setVista('puerta'); setError(''); }}
            onEntrar={entrar}
            onArranque={() => setHaySuper(true)}
          />
        )}
    </Cascaron>
  );
}

function Formulario({
  vista,
  alta,
  error,
  onError,
  onAlta,
  onVolver,
  onEntrar,
  onArranque,
}: {
  vista: 'solicitante' | 'personal' | 'arranque';
  alta: boolean;
  error: string;
  onError: (valor: string) => void;
  onAlta: () => void;
  onVolver: () => void;
  onEntrar: (cuenta: CuentaTramite) => void;
  onArranque: () => void;
}) {
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onError('');
    const datos = Object.fromEntries(new FormData(evento.currentTarget).entries());
    try {
      if (vista === 'arranque') {
        const cuenta = await apiTramite<CuentaTramite>('/cuentas/super-admin', { method: 'POST', body: JSON.stringify(datos) });
        onArranque();
        onEntrar(cuenta);
        return;
      }
      const ruta = vista === 'solicitante' && alta ? '/cuentas/solicitante' : '/sesion';
      const cuerpo = vista === 'solicitante' && alta ? datos : { correo: datos.correo, password: datos.password, clase: vista === 'solicitante' ? 'solicitante' : 'personal' };
      const cuenta = await apiTramite<CuentaTramite>(ruta, { method: 'POST', body: JSON.stringify(cuerpo) });
      onEntrar(cuenta);
    } catch (causa) {
      onError(mensajeDe(causa));
    }
  }

  const creando = vista === 'arranque' || (vista === 'solicitante' && alta);
  return (
    <form onSubmit={enviar}>
      <button type="button" className="btn btn-outline" onClick={onVolver}>Volver</button>
      <h1>{vista === 'arranque' ? 'Cuenta de arranque' : vista === 'solicitante' ? 'Tu expediente' : 'Cuenta de personal'}</h1>
      <p className="subtitle">
        {vista === 'arranque'
          ? 'Esta cuenta administra las cuentas del personal. No dictamina ni paga. Solo se crea una vez.'
          : vista === 'solicitante'
            ? 'Creas tu cuenta. Después verás las convocatorias publicadas y solo lo que tú solicites.'
            : 'Entra con la cuenta que te asignaron. El puesto no se elige aquí.'}
      </p>
      <section className="bloque"><div className="grupo">
      {creando ? <label className="campo">Nombre<input name="nombre" required /></label> : null}
      <label className="campo">Correo<input name="correo" type="email" required /></label>
      <label className="campo">Contraseña<input name="password" type="password" required minLength={8} /></label>
      </div>
      {error ? <p className="aviso">{error}</p> : null}
      <button className={accion} type="submit" style={{ marginTop: 14 }}>{creando ? 'Crear cuenta' : 'Entrar'}</button>
      {vista === 'solicitante' ? (
        <button type="button" className="block text-sm text-[#355044]" onClick={onAlta}>
          {alta ? 'Ya tengo cuenta' : 'Crear una cuenta'}
        </button>
      ) : null}
      </section>
    </form>
  );
}

function Sesion({ cuenta }: { cuenta: CuentaTramite }) {
  if (cuenta.puesto === 'super_admin') return <PanelSuper cuenta={cuenta} />;
  if (cuenta.puesto === 'convocatorias') return <InicioConvocatorias />;
  if (cuenta.clase === 'solicitante') return <InicioSolicitante cuenta={cuenta} />;
  if (cuenta.puesto === 'delegacion') return <InicioDelegacion cuenta={cuenta} />;
  if (cuenta.puesto === 'coordinacion_delegaciones') {
    return (
      <div className="space-y-6">
        <h1>Hola, {cuenta.nombre}</h1>
        <TablaSolicitudes encabezado="Solicitudes enviadas" texto="Consulta de todas las delegaciones. No se editan desde aquí." />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1>Hola, {cuenta.nombre}</h1>
        <p className="text-[#355044]">
          Tu puesto es {nombrePuesto(cuenta.puesto)}{cuenta.delegacion ? `, ${cuenta.delegacion}` : ''}. En solicitudes todavía no tienes bandeja.
        </p>
      </div>
      <ListaPublica />
    </div>
  );
}

function PanelSuper({ cuenta }: { cuenta: CuentaTramite }) {
  const [ver, setVer] = useState<'cuentas' | 'solicitudes' | 'convocatorias'>('cuentas');
  return (
    <>
      <div className="fila">
        <div><p className="subtitle">Doce puestos</p><h1>Cuentas</h1></div>
        <div className="acciones">
          <button type="button" className={ver === 'solicitudes' ? accion : secundario} onClick={() => setVer('solicitudes')}>Solicitudes</button>
          <button type="button" className={ver === 'convocatorias' ? accion : secundario} onClick={() => setVer('convocatorias')}>Convocatorias</button>
          <Link className={accion} to="/tramite/cuentas/nueva">Nueva cuenta</Link>
        </div>
      </div>
      {ver === 'cuentas' ? <AdminCuentas cuenta={cuenta} /> : null}
      {ver === 'solicitudes' ? <TablaSolicitudes encabezado="Solicitudes" texto="Incluye borradores. Desde aquí no se aprueba, no se publica y no se recibe." /> : null}
      {ver === 'convocatorias' ? <TablaConvocatoriasAuditoria /> : null}
    </>
  );
}

function InicioDelegacion({ cuenta }: { cuenta: CuentaTramite }) {
  return (
    <>
      <h1>Recepción</h1>
      <p className="nota">Solicitudes de {cuenta.delegacion || 'tu delegación'}.</p>
      <section className="rejilla">
        <Link className="card" to="/tramite/bandeja"><strong>Bandeja</strong><span>Solicitudes enviadas a esta delegación.</span></Link>
        <Link className="card" to="/tramite/recepcion"><strong>Recepción</strong><span>Lo que se llenó, el mapa del predio y el shapefile.</span></Link>
        <Link className="card" to="/tramite/solicitantes"><strong>Solicitantes</strong><span>Quienes enviaron una solicitud.</span></Link>
      </section>
    </>
  );
}

export function BandejaDelegacion() {
  const cuenta = leerCuenta();
  return (
    <Cascaron>
      <TablaSolicitudes encabezado={`Solicitudes de ${cuenta?.delegacion || 'tu delegación'}`} texto="Abre una para ver el predio, el mapa y el shapefile." />
    </Cascaron>
  );
}

export function EntradaRecepcion() {
  const [destino, setDestino] = useState<number | null>(null);
  const [vacio, setVacio] = useState(false);

  useEffect(() => {
    apiTramite<Solicitud[]>('/solicitudes')
      .then((filas) => {
        if (filas[0]) setDestino(filas[0].id);
        else setVacio(true);
      })
      .catch(() => setVacio(true));
  }, []);

  if (destino) return <Navigate to={`/tramite/solicitudes/${destino}`} replace />;
  return (
    <Cascaron>
      <h1>Recepción</h1>
      <p className="nota">{vacio ? 'Todavía no hay una solicitud enviada a esta delegación.' : 'Cargando…'}</p>
    </Cascaron>
  );
}

export function SolicitantesDelegacion() {
  const [filas, setFilas] = useState<Solicitud[]>([]);

  useEffect(() => {
    apiTramite<Solicitud[]>('/solicitudes').then(setFilas).catch(() => setFilas([]));
  }, []);

  return (
    <Cascaron>
      <h1>Solicitantes</h1>
      {filas.length === 0 ? <p className="nota">Todavía no hay solicitudes enviadas.</p> : (
        <section className="tabla">
          <table>
            <thead>
              <tr><th>Titular</th><th>Predio</th><th>Municipio</th><th>Programa</th><th></th></tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td>{fila.personas.find((persona) => persona.rol === 'titular')?.nombre || '—'}</td>
                  <td>{fila.nombre_predio || '—'}</td>
                  <td>{fila.municipio || '—'}</td>
                  <td>{PROGRAMAS.find((programa) => programa.clave === fila.programa)?.nombre || fila.programa}</td>
                  <td><Link to={`/tramite/solicitudes/${fila.id}`}>Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </Cascaron>
  );
}

function AdminCuentas({ cuenta }: { cuenta: CuentaTramite }) {
  const [filas, setFilas] = useState<Personal[]>([]);
  const [delegaciones, setDelegaciones] = useState<string[]>([]);
  const [pagina, setPagina] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function cargar() {
    const lista = await apiTramite<Personal[]>('/cuentas');
    setFilas(lista);
    return lista;
  }

  useEffect(() => {
    cargar().catch((causa) => setError(mensajeDe(causa)));
    apiTramite<string[]>('/delegaciones').then(setDelegaciones).catch(() => setDelegaciones([]));
  }, []);

  async function cambiar(fila: Personal, cuerpo: Record<string, unknown>) {
    setError('');
    try {
      await apiTramite(`/cuentas/${fila.id}`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
      await cargar();
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, paginas - 1);
  const inicio = paginaSegura * POR_PAGINA;
  const visibles = filas.slice(inicio, inicio + POR_PAGINA);

  return (
    <>
      {error ? <p className="aviso">{error}</p> : null}
      {aviso ? <p className="nota">{aviso}</p> : null}
      {filas.length === 0 ? (
        <p className="nota">Todavía no hay cuentas de personal.</p>
      ) : (
        <section className="tabla">
            <table>
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Correo</th>
                  <th>Puesto</th>
                  <th>Delegación</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila) => (
                  <tr key={`${fila.id}-${fila.puesto}-${fila.delegacion}-${fila.activo}`} className="border-b border-[#6B8B78]/20 align-middle">
                    <td className="px-3 py-4 font-medium">{fila.nombre}</td>
                    <td className="px-3 py-4 text-[#355044]">{fila.correo}</td>
                    <td className="px-3 py-4">
                      <select name="puesto" form={`cuenta-${fila.id}`} defaultValue={fila.puesto || 'convocatorias'} className={celda} aria-label={`Puesto de ${fila.nombre}`}>
                        {PUESTOS.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-4">
                      <select name="delegacion" form={`cuenta-${fila.id}`} defaultValue={fila.delegacion || ''} className={celda} aria-label={`Delegación de ${fila.nombre}`}>
                        <option value="">Sin delegación</option>
                        {delegaciones.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-4">{fila.activo ? 'Activa' : 'Desactivada'}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button className={secundario} type="submit" form={`cuenta-${fila.id}`}>Guardar</button>
                        <button type="button" className={secundario} onClick={() => cambiar(fila, { activo: !fila.activo })}>
                          {fila.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibles.map((fila) => (
              <form
                key={fila.id}
                id={`cuenta-${fila.id}`}
                className="hidden"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  const datos = Object.fromEntries(new FormData(evento.currentTarget).entries());
                  cambiar(fila, { puesto: datos.puesto, delegacion: datos.delegacion || null });
                }}
              />
            ))}
        </section>
      )}
      <div className="acciones" style={{ marginTop: 16 }}>
        <button type="button" className={secundario} disabled={paginaSegura === 0} onClick={() => setPagina(paginaSegura - 1)}>Anterior</button>
        <button type="button" className={secundario} disabled={paginaSegura >= paginas - 1} onClick={() => setPagina(paginaSegura + 1)}>Siguiente</button>
      </div>
    </>
  );
}

function InicioSolicitante({ cuenta }: { cuenta: CuentaTramite }) {
  const [filas, setFilas] = useState<{ id: number; programa: string; nombre_predio?: string; municipio: string; delegacion: string; estado: string }[]>([]);
  const [avisos, setAvisos] = useState(0);

  useEffect(() => {
    apiTramite<typeof filas>('/solicitudes').then((lista) => setFilas(lista)).catch(() => setFilas([]));
  }, []);

  const primera = filas[0];
  return (
    <>
      <div className="fila">
        <div>
          <p className="subtitle">{cuenta.nombre}{primera ? ` · ${PROGRAMAS[primera.programa] || primera.programa}` : ''}</p>
          <h1>Tu trámite</h1>
        </div>
        <Link className="btn btn-primary" to="/tramite/expediente">Ver expediente</Link>
      </div>
      <div className="rejilla">
        <article className="card">
          {primera ? <span className="estado">{etiquetaEstado(primera.estado)}</span> : null}
          <h2>{primera?.nombre_predio || 'Sin predio'}</h2>
          <p>{primera ? `${primera.municipio}, delegación ${primera.delegacion}.` : 'Todavía no abres una solicitud.'}</p>
        </article>
        <article className="card">
          <span className="num">{avisos}</span>
          <h2>{avisos === 1 ? 'Aviso nuevo' : 'Avisos'}</h2>
          <p>Se leen en Avisos. El correo se guarda y no se envía.</p>
        </article>
        <article className="card">
          <h2>Otra solicitud</h2>
          <p>Puedes abrir otra del mismo programa mientras la recepción siga abierta.</p>
          <Link className="btn btn-outline" to="/tramite/convocatorias" style={{ marginTop: 12 }}>Ver convocatorias</Link>
        </article>
      </div>
    </>
  );
}

function InicioConvocatorias() {
  const [abiertas, setAbiertas] = useState(0);
  const [listas, setListas] = useState(0);

  useEffect(() => {
    apiTramite<{ lectura: string; anexos: { tipo: string }[] }[]>('/convocatorias').then((lista) => {
      setAbiertas(lista.filter((fila) => fila.lectura === 'Recepción abierta').length);
      setListas(lista.filter((fila) => fila.anexos.some((anexo) => anexo.tipo === 'resultado') || fila.lectura === 'Lista publicada').length);
    }).catch(() => {
      setAbiertas(0);
      setListas(0);
    });
  }, []);

  return (
    <>
      <div className="fila">
        <div><p className="subtitle">Ejercicio 2026</p><h1>Convocatorias</h1></div>
        <Link className="btn btn-primary" to="/tramite/convocatorias/nueva">Crear convocatoria</Link>
      </div>
      <div className="rejilla">
        <article className="card"><span className="num">{abiertas}</span><h2>En recepción</h2><p>La fecha de operación manda, no el día del servidor.</p></article>
        <article className="card"><span className="num">{listas}</span><h2>Con lista</h2><p>La lista de personas beneficiarias se anexa como resultado.</p></article>
        <article className="card"><h2>Si queda recurso</h2><p>Puedes abrir una segunda convocatoria. La primera sigue consultable.</p></article>
      </div>
    </>
  );
}

function etiquetaEstado(estado: string) {
  if (estado === 'enviada') return 'Enviada';
  if (estado === 'borrador') return 'Borrador';
  return estado;
}
