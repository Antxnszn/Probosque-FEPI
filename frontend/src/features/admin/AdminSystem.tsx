import { Server, CheckCircle2, RefreshCw, Satellite } from 'lucide-react';

export function AdminSystem() {
  const services = [
    { name: 'FastAPI REST Core API', status: 'Healthy', latency: '24ms', version: 'v2.1.0' },
    { name: 'PostgreSQL + PostGIS 16', status: 'Healthy', latency: '4ms', version: '16.2-PostGIS' },
    { name: 'Redis Cache & Event Bus', status: 'Healthy', latency: '1ms', version: '7.2-alpine' },
    { name: 'MinIO S3 Evidence Storage', status: 'Healthy', latency: '12ms', version: 'RELEASE.2024' },
    { name: 'Google Earth Engine (GEE) Connector', status: 'Healthy', latency: '115ms', version: 'API v1' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-forest-400" />
          Estado de Infraestructura y Servicios Centrales
        </h1>
        <p className="text-xs text-slate-400">
          Monitoreo de microservicios, bases de datos PostGIS, almacenamiento distribuido y procesamiento satelital
        </p>
      </div>

      {/* Services Health Grid matching section 4.12 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((srv) => (
          <div key={srv.name} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white truncate">{srv.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Healthy
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
              <span>Latencia: {srv.latency}</span>
              <span>{srv.version}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Backlog & Satellite Processing Stats matching section 4.12 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Backlog Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              Cola de Transmisión y Workers
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Broker Celery/Redis</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Sync Backlog</span>
              <span className="text-2xl font-black text-white font-mono">17</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">En cola de subida</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Failed Jobs</span>
              <span className="text-2xl font-black text-rose-400 font-mono">2</span>
              <span className="text-[10px] text-rose-400/80 block mt-0.5">Reintentos activos</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Storage MinIO</span>
              <span className="text-2xl font-black text-indigo-400 font-mono">64%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">2.4 TB utilizados</span>
            </div>
          </div>
        </div>

        {/* Satellite Processing Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Satellite className="w-4 h-4 text-emerald-400" />
              Procesamiento Sentinel-2 (Pipeline GEE)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">GEE Earth Engine</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Completed</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">1,821</span>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">Escenas procesadas</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Pending</span>
              <span className="text-2xl font-black text-amber-400 font-mono">14</span>
              <span className="text-[10px] text-amber-400/80 block mt-0.5">En órbita</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Failed</span>
              <span className="text-2xl font-black text-slate-400 font-mono">3</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Nubosidad crítica</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
