import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trees } from 'lucide-react';

type ServicioSalud = {
  clave: string;
  requisito: string;
  nombre: string;
  estado: string;
  bus?: string;
  detalle?: string;
};

type SaludTramite = {
  orquestador: string;
  fecha_operacion: { valor: string; origen: string };
  servicios: ServicioSalud[];
};

const ESTRUCTURA: ServicioSalud[] = [
  {
    clave: 'orquestador',
    requisito: '',
    nombre: 'Orquestador del trámite',
    estado: 'no_disponible',
  },
  {
    clave: 'convocatorias',
    requisito: 'REQ-01',
    nombre: 'Publicación y consulta de convocatorias',
    estado: 'no_disponible',
  },
  {
    clave: 'expediente-digital',
    requisito: 'REQ-02',
    nombre: 'Postulación, registro de solicitud y expediente digital',
    estado: 'no_disponible',
  },
  {
    clave: 'dictaminacion',
    requisito: 'REQ-03',
    nombre: 'Evaluación integral, dictaminación y asignación colegiada',
    estado: 'no_disponible',
  },
  {
    clave: 'formalizacion-seguimiento',
    requisito: 'REQ-04',
    nombre: 'Formalización contractual, asignación de insumos, dispersión financiera y seguimiento',
    estado: 'no_disponible',
  },
  {
    clave: 'metricas-cierre',
    requisito: 'REQ-05',
    nombre: 'Métricas de desempeño y cierre del programa',
    estado: 'no_disponible',
  },
  {
    clave: 'visor-calculadora',
    requisito: '',
    nombre: 'Calculadora de masa forestal y visor',
    estado: 'no_disponible',
  },
];

function etiquetaEstado(estado: string) {
  if (estado === 'disponible') return 'Disponible';
  if (estado === 'no_disponible') return 'No disponible';
  return estado;
}

export function GestionEstructuraPage() {
  const [salud, setSalud] = useState<SaludTramite | null>(null);
  const [errorOrquestador, setErrorOrquestador] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busTexto, setBusTexto] = useState<string | null>(null);
  const [probandoBus, setProbandoBus] = useState(false);

  const consultar = useCallback(async () => {
    setCargando(true);
    setErrorOrquestador(null);
    try {
      const respuesta = await fetch('/api/tramite/v1/salud');
      if (!respuesta.ok) {
        setSalud(null);
        setErrorOrquestador(`El orquestador respondió ${respuesta.status}.`);
        return;
      }
      const cuerpo = (await respuesta.json()) as SaludTramite;
      if (!cuerpo || !Array.isArray(cuerpo.servicios)) {
        setSalud(null);
        setErrorOrquestador('El orquestador no entregó el estado de los servicios.');
        return;
      }
      setSalud(cuerpo);
    } catch {
      setSalud(null);
      setErrorOrquestador('El orquestador no respondió. Los servicios de abajo no se marcaron como disponibles.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  async function probarBus() {
    setProbandoBus(true);
    setBusTexto(null);
    try {
      const respuesta = await fetch('/api/tramite/v1/bus/prueba', { method: 'POST' });
      const cuerpo = await respuesta.json();
      setBusTexto(JSON.stringify(cuerpo, null, 2));
    } catch {
      setBusTexto('El bus no se pudo probar porque el orquestador no respondió.');
    } finally {
      setProbandoBus(false);
    }
  }

  const filas: ServicioSalud[] = salud
    ? [
        {
          clave: 'orquestador',
          requisito: '',
          nombre: 'Orquestador del trámite',
          estado: salud.orquestador,
        },
        ...salud.servicios,
      ]
    : ESTRUCTURA;

  const fecha = salud?.fecha_operacion;

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif]">
      <header className="max-w-6xl mx-auto pt-6 px-4 sm:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4 rounded-full bg-[#D9D1B8] px-6 py-3.5">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#355044] text-[#F4F1EA]">
              <Trees className="w-5 h-5" />
            </span>
            <span className="font-['Outfit',sans-serif] text-xl font-medium">PROBOSQUE</span>
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium text-[#355044]">
            <Link to="/visor">Visor Forestal</Link>
            <Link to="/gestion" className="text-[#1B2A24]">Trámite</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 pb-24 space-y-8">
        <section className="space-y-3">
          <p className="text-sm font-semibold text-[#E0643A]">Fase 0. Estructura del trámite</p>
          <h1 className="font-['Outfit',sans-serif] text-4xl font-light tracking-tight">
            Servicios del trámite y de la calculadora
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-[#355044]">
            Esta pantalla solo dice si cada proceso responde. No hay convocatorias, solicitudes, dictámenes ni polígonos.
            Si un servicio está apagado, queda como no disponible.
          </p>
        </section>

        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[#6B8B78]">Fecha de operación</p>
            <p className="font-['Outfit',sans-serif] text-3xl font-light">
              {fecha ? fecha.valor : 'Sin dato'}
            </p>
            <p className="text-sm text-[#6B8B78]">
              {fecha
                ? fecha.origen === 'configuracion'
                  ? 'Sale de la configuración del orquestador.'
                  : 'El orquestador no tiene fecha configurada y usó el reloj del servidor.'
                : 'No hay fecha porque el orquestador no respondió.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void consultar()}
              className="rounded-full bg-[#355044] px-5 py-2.5 text-sm font-semibold text-[#F4F1EA]"
            >
              {cargando ? 'Consultando' : 'Volver a consultar'}
            </button>
            <button
              type="button"
              onClick={() => void probarBus()}
              disabled={probandoBus}
              className="rounded-full bg-[#D9D1B8] px-5 py-2.5 text-sm font-semibold text-[#1B2A24] disabled:opacity-60"
            >
              {probandoBus ? 'Probando el bus' : 'Probar el bus'}
            </button>
          </div>
        </section>

        {errorOrquestador ? (
          <p className="rounded-2xl bg-[#E0643A]/10 px-5 py-4 text-sm text-[#1B2A24]">{errorOrquestador}</p>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[#6B8B78]">
              <tr>
                <th className="py-3 pr-4 font-medium">Requisito</th>
                <th className="py-3 pr-4 font-medium">Servicio</th>
                <th className="py-3 pr-4 font-medium">Nombre</th>
                <th className="py-3 pr-4 font-medium">Estado</th>
                <th className="py-3 font-medium">Bus</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.clave} className="border-t border-[#6B8B78]/20 align-top">
                  <td className="py-4 pr-4">{fila.requisito || '—'}</td>
                  <td className="py-4 pr-4 font-medium">{fila.clave}</td>
                  <td className="py-4 pr-4 max-w-md">{fila.nombre}</td>
                  <td className="py-4 pr-4">
                    <span className={`whitespace-nowrap ${fila.estado === 'disponible' ? 'text-[#355044]' : 'text-[#E0643A]'}`}>
                      {etiquetaEstado(fila.estado)}
                    </span>
                    {fila.detalle ? <span className="block text-xs text-[#6B8B78]">{fila.detalle}</span> : null}
                  </td>
                  <td className="py-4">{fila.bus ? etiquetaEstado(fila.bus) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {busTexto ? (
          <section className="space-y-2">
            <h2 className="font-['Outfit',sans-serif] text-2xl font-light">Resultado de la prueba del bus</h2>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#1B2A24] p-5 text-xs leading-relaxed text-[#F4F1EA]">
              {busTexto}
            </pre>
          </section>
        ) : null}
      </main>
    </div>
  );
}
