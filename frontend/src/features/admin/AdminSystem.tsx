import { Server, CheckCircle2, RefreshCw, Satellite } from 'lucide-react';

export function AdminSystem() {
  const services = [
    { name: 'FastAPI REST Core API', status: 'Operativo', latency: '24ms', version: 'v2.1.0' },
    { name: 'PostgreSQL + PostGIS 16', status: 'Operativo', latency: '4ms', version: '16.2-PostGIS' },
    { name: 'Redis Cache & Cola Asíncrona', status: 'Operativo', latency: '1ms', version: '7.2-alpine' },
    { name: 'MinIO Almacén Criptográfico', status: 'Operativo', latency: '12ms', version: 'S3-Compatible' },
    { name: 'Conector Google Earth Engine', status: 'Operativo', latency: '115ms', version: 'API v1' },
  ];

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="border-b border-[#6B8B78]/20 pb-4">
        <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
        <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
          <Server className="w-6 h-6 text-[#355044]" />
          <span>Infraestructura y Servicios Centrales</span>
        </h1>
        <p className="text-sm text-[#6B8B78] mt-1">
          Monitoreo de microservicios, persistencia PostGIS, almacenamiento de evidencias y motor satelital
        </p>
      </div>

      {/* Services Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((srv) => (
          <div key={srv.name} className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-5 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[#1B2A24] truncate">{srv.name}</span>
              <span className="px-3 py-1 rounded-full bg-[#B9C8B2] text-[#1B2A24] font-semibold text-[11px] flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
                <span>{srv.status}</span>
              </span>
            </div>
            <div className="flex justify-between text-xs text-[#6B8B78] pt-2 border-t border-[#6B8B78]/15">
              <span>Latencia: {srv.latency}</span>
              <span className="font-medium text-[#1B2A24]">{srv.version}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Backlog & Satellite Processing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sync Backlog Card */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-[#6B8B78]/15 pb-3">
            <h3 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#355044]" />
              <span>Cola de Sincronización y Transmisión</span>
            </h3>
            <span className="text-xs text-[#6B8B78]">Broker Redis</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
              <span className="text-xs text-[#6B8B78] block">En Tránsito</span>
              <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#1B2A24] tabular-nums mt-1 block">
                17
              </span>
              <span className="text-[11px] text-[#6B8B78] block mt-0.5">En cola de subida</span>
            </div>

            <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
              <span className="text-xs text-[#E0643A] block">Reintentos</span>
              <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#E0643A] tabular-nums mt-1 block">
                2
              </span>
              <span className="text-[11px] text-[#6B8B78] block mt-0.5">Reintentos activos</span>
            </div>

            <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
              <span className="text-xs text-[#355044] block">Almacén S3</span>
              <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#355044] tabular-nums mt-1 block">
                64%
              </span>
              <span className="text-[11px] text-[#6B8B78] block mt-0.5">2.4 TB utilizados</span>
            </div>
          </div>
        </div>

        {/* Satellite Processing Stats */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-[#6B8B78]/15 pb-3">
            <h3 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
              <Satellite className="w-4 h-4 text-[#355044]" />
              <span>Procesamiento Satelital Sentinel-2</span>
            </h3>
            <span className="text-xs text-[#6B8B78]">Pipeline GEE</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
              <span className="text-xs text-[#355044] block">Completadas</span>
              <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#355044] tabular-nums mt-1 block">
                1,821
              </span>
              <span className="text-[11px] text-[#6B8B78] block mt-0.5">Escenas analizadas</span>
            </div>

            <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
              <span className="text-xs text-[#6B8B78] block">En Proceso</span>
              <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#1B2A24] tabular-nums mt-1 block">
                14
              </span>
              <span className="text-[11px] text-[#6B8B78] block mt-0.5">En pase orbital</span>
            </div>

            <div className="rounded-2xl bg-[#F4F1EA] p-4 shadow-inner">
              <span className="text-xs text-[#6B8B78] block">Sin Nubes</span>
              <span className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-light text-[#355044] tabular-nums mt-1 block">
                98.2%
              </span>
              <span className="text-[11px] text-[#6B8B78] block mt-0.5">Válidas para triage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
