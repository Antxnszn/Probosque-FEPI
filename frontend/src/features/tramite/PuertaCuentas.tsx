import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  PUESTOS,
  apiTramite,
  guardarCuenta,
  leerCuenta,
  salirTramite,
  type CuentaTramite,
} from './cliente';
import { AdminConvocatorias, ListaPublica } from './Convocatorias';
import { TablaConvocatoriasAuditoria, TablaSolicitudes } from './Solicitudes';

const titulo = "font-['Outfit',sans-serif] text-4xl font-light tracking-tight text-[#1B2A24]";
const accion = 'rounded-full bg-[#E0643A] px-5 py-2.5 text-sm font-semibold text-white';
const secundario = 'rounded-full bg-[#D9D1B8] px-5 py-2.5 text-sm font-semibold text-[#1B2A24]';
const campo = 'mt-1 w-full border-b border-[#6B8B78]/50 bg-transparent py-2 text-[#1B2A24] focus:outline-none';
const celda = 'w-full min-w-40 rounded-full bg-[#EAE4D3] px-3 py-2 text-sm text-[#1B2A24]';
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

  function salir() {
    salirTramite();
    setCuenta(null);
    setVista('puerta');
  }

  const ancho = cuenta ? 'max-w-6xl' : 'max-w-3xl';

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif]">
      <header className={`${ancho} mx-auto px-4 pt-6`}>
        <nav className="flex items-center justify-between rounded-full bg-[#D9D1B8] px-6 py-3.5">
          <Link to="/" className="font-['Outfit',sans-serif] text-xl">PROBOSQUE</Link>
          <span className="text-sm text-[#355044]">Trámite de apoyos</span>
          {cuenta ? (
            <button type="button" className="text-sm font-semibold text-[#E0643A]" onClick={salir}>Salir</button>
          ) : (
            <Link to="/" className="text-sm text-[#355044]">Consulta forestal</Link>
          )}
        </nav>
      </header>
      <main className={`${ancho} mx-auto px-4 pt-12 pb-20`}>
        {cuenta ? (
          <Sesion cuenta={cuenta} />
        ) : vista === 'puerta' ? (
          <div className="space-y-6">
            <p className="text-sm font-semibold text-[#E0643A]">Apoyos 2026</p>
            <h1 className={titulo}>Elige cómo entras</h1>
            <p className="max-w-xl text-[#355044]">La cuenta de quien solicita y la cuenta de personal son distintas. Esta puerta no es el visor ni la calculadora.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={accion} onClick={() => { setVista('solicitante'); setAlta(true); setError(''); }}>Soy solicitante</button>
              <button type="button" className={secundario} onClick={() => { setVista('personal'); setError(''); }}>Soy personal</button>
            </div>
            {!haySuper ? (
              <button type="button" className="text-sm text-[#355044]" onClick={() => { setVista('arranque'); setError(''); }}>
                Crear la cuenta de arranque
              </button>
            ) : null}
            <ListaPublica />
          </div>
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
      </main>
    </div>
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
    <form onSubmit={enviar} className="max-w-md space-y-5">
      <button type="button" className="text-sm text-[#355044]" onClick={onVolver}>Volver</button>
      <h1 className={titulo}>
        {vista === 'arranque' ? 'Cuenta de arranque' : vista === 'solicitante' ? 'Tu expediente' : 'Cuenta de personal'}
      </h1>
      <p className="text-[#355044]">
        {vista === 'arranque'
          ? 'Esta cuenta administra las cuentas del personal. No dictamina ni paga. Solo se crea una vez.'
          : vista === 'solicitante'
            ? 'Creas tu cuenta. Después verás las convocatorias publicadas y solo lo que tú solicites.'
            : 'Entra con la cuenta que te asignaron. El puesto no se elige aquí.'}
      </p>
      {creando ? <label className="block text-sm">Nombre<input name="nombre" required className={campo} /></label> : null}
      <label className="block text-sm">Correo<input name="correo" type="email" required className={campo} /></label>
      <label className="block text-sm">Contraseña<input name="password" type="password" required minLength={8} className={campo} /></label>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      <button className={accion} type="submit">{creando ? 'Crear cuenta' : 'Entrar'}</button>
      {vista === 'solicitante' ? (
        <button type="button" className="block text-sm text-[#355044]" onClick={onAlta}>
          {alta ? 'Ya tengo cuenta' : 'Crear una cuenta'}
        </button>
      ) : null}
    </form>
  );
}

function Sesion({ cuenta }: { cuenta: CuentaTramite }) {
  if (cuenta.puesto === 'super_admin') return <PanelSuper cuenta={cuenta} />;
  if (cuenta.puesto === 'convocatorias') {
    return (
      <div className="space-y-16">
        <AdminConvocatorias />
        <TablaSolicitudes encabezado="Solicitudes enviadas" texto="Consulta de las convocatorias que publicas. No se reciben ni se corrigen aquí." />
      </div>
    );
  }
  if (cuenta.clase === 'solicitante') {
    return (
      <div className="space-y-12">
        <div>
          <h1 className={titulo}>Hola, {cuenta.nombre}</h1>
          <p className="text-[#355044]">Aplicar aparece solo mientras la recepción está abierta. Cada predio es una solicitud.</p>
        </div>
        <ListaPublica aplicar />
        <TablaSolicitudes encabezado="Tus solicitudes" texto="Solo ves las que abriste con esta cuenta." />
      </div>
    );
  }
  if (cuenta.puesto === 'delegacion') {
    return (
      <div className="space-y-6">
        <h1 className={titulo}>Hola, {cuenta.nombre}</h1>
        <TablaSolicitudes encabezado={`Solicitudes de ${cuenta.delegacion || 'tu delegación'}`} texto="Solo las enviadas de esta delegación. El folio se asigna en el siguiente paso." />
      </div>
    );
  }
  if (cuenta.puesto === 'coordinacion_delegaciones') {
    return (
      <div className="space-y-6">
        <h1 className={titulo}>Hola, {cuenta.nombre}</h1>
        <TablaSolicitudes encabezado="Solicitudes enviadas" texto="Consulta de todas las delegaciones. No se editan desde aquí." />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className={titulo}>Hola, {cuenta.nombre}</h1>
        <p className="text-[#355044]">
          Tu puesto es {nombrePuesto(cuenta.puesto)}{cuenta.delegacion ? `, ${cuenta.delegacion}` : ''}. En solicitudes todavía no tienes bandeja.
        </p>
      </div>
      <ListaPublica />
    </div>
  );
}

function PanelSuper({ cuenta }: { cuenta: CuentaTramite }) {
  const [menu, setMenu] = useState<'cuentas' | 'solicitudes' | 'convocatorias'>('cuentas');
  const activo = 'rounded-full bg-[#E0643A] px-4 py-2 text-sm font-semibold text-white';
  const quieto = 'rounded-full bg-[#EAE4D3] px-4 py-2 text-sm font-semibold text-[#1B2A24]';
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={menu === 'cuentas' ? activo : quieto} onClick={() => setMenu('cuentas')}>Cuentas</button>
        <button type="button" className={menu === 'solicitudes' ? activo : quieto} onClick={() => setMenu('solicitudes')}>Solicitudes</button>
        <button type="button" className={menu === 'convocatorias' ? activo : quieto} onClick={() => setMenu('convocatorias')}>Convocatorias</button>
      </div>
      {menu === 'cuentas' ? <AdminCuentas cuenta={cuenta} /> : null}
      {menu === 'solicitudes' ? (
        <TablaSolicitudes encabezado="Solicitudes" texto="Incluye borradores. Desde aquí no se aprueba, no se publica y no se recibe." />
      ) : null}
      {menu === 'convocatorias' ? <TablaConvocatoriasAuditoria /> : null}
    </div>
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

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setAviso('');
    const formulario = evento.currentTarget;
    const datos = Object.fromEntries(new FormData(formulario).entries());
    try {
      await apiTramite('/cuentas', { method: 'POST', body: JSON.stringify(datos) });
      formulario.reset();
      setAviso('La cuenta quedó creada.');
      const lista = await cargar();
      setPagina(Math.max(0, Math.ceil(lista.length / POR_PAGINA) - 1));
    } catch (causa) {
      setError(mensajeDe(causa));
    }
  }

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
    <div className="space-y-10">
      <div>
        <p className="text-sm font-semibold text-[#E0643A]">Super admin</p>
        <h1 className={titulo}>Cuentas de personal</h1>
        <p className="text-[#355044]">{cuenta.nombre}, desde aquí abres y corriges las cuentas del personal.</p>
      </div>
      {error ? <p className="text-[#E0643A]">{error}</p> : null}
      {aviso ? <p className="text-[#355044]">{aviso}</p> : null}
      <form onSubmit={crear} className="max-w-md space-y-4">
        <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Nueva cuenta</h2>
        <input name="nombre" required placeholder="Nombre" className={campo} />
        <input name="correo" type="email" required placeholder="Correo" className={campo} />
        <input name="password" type="password" required minLength={8} placeholder="Contraseña" className={campo} />
        <select name="puesto" className={campo} defaultValue="convocatorias">
          {PUESTOS.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
        </select>
        <select name="delegacion" className={campo} defaultValue="">
          <option value="">Delegación, solo si el puesto es delegación</option>
          {delegaciones.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
        </select>
        <button className={accion} type="submit">Crear cuenta</button>
      </form>
      {filas.length === 0 ? (
        <p className="text-[#355044]">Todavía no hay cuentas de personal.</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#6B8B78]/40 text-[#355044]">
                  <th className="px-3 py-3 font-medium">Nombre</th>
                  <th className="px-3 py-3 font-medium">Correo</th>
                  <th className="px-3 py-3 font-medium">Puesto</th>
                  <th className="px-3 py-3 font-medium">Delegación</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Acciones</th>
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
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm tabular-nums text-[#355044]">
              {inicio + 1}–{inicio + visibles.length} de {filas.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${secundario} disabled:opacity-40`} disabled={paginaSegura === 0} onClick={() => setPagina(paginaSegura - 1)}>Anterior</button>
              {Array.from({ length: paginas }, (_, indice) => (
                <button
                  key={indice}
                  type="button"
                  className={indice === paginaSegura ? accion : secundario}
                  onClick={() => setPagina(indice)}
                >
                  {indice + 1}
                </button>
              ))}
              <button type="button" className={`${secundario} disabled:opacity-40`} disabled={paginaSegura >= paginas - 1} onClick={() => setPagina(paginaSegura + 1)}>Siguiente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
