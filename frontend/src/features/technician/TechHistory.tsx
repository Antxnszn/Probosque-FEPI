import { useState, useEffect } from 'react';
import { History, CheckCircle2, Clock, AlertTriangle, Lock, MapPin, Calendar } from 'lucide-react';
import { db } from '../../db/dexie';
import type { AuditRecord, PlotRecord } from '../../types';

export function TechHistory() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [plots, setPlots] = useState<Record<string, PlotRecord>>({});

  useEffect(() => {
    async function loadHistory() {
      const allAudits = await db.audits.toArray();
      const allPlots = await db.plots.toArray();
      const plotMap: Record<string, PlotRecord> = {};
      allPlots.forEach((p) => {
        plotMap[p.id] = p;
      });
      setPlots(plotMap);

      if (allAudits.length === 0) {
        // Seed visual audits for history matching section 3.8 if empty
        const sampleAudits: AuditRecord[] = [
          {
            id: 'audit-00451',
            plotId: 'plot-pb-00451',
            plotCadastralKey: 'PB-2026-00451',
            technicianId: 'tech-juan-perez',
            technicianName: 'Ing. Juan Pérez',
            startedAt: '2026-10-06T11:42:00Z',
            completedAt: '2026-10-06T12:35:00Z',
            syncedAt: '2026-10-07T09:42:00Z',
            status: 'COMPLETADA',
            syncStatus: 'SYNCED',
            startLat: 19.2465,
            startLon: -99.7198,
            startAccuracyM: 8.0,
            geofenceValid: true,
            geofenceDistanceM: 12.0,
            samplingUnits: [],
            evidenceCount: 8,
            idempotencyKey: 'key-451',
          },
          {
            id: 'audit-00452',
            plotId: 'plot-pb-00452',
            plotCadastralKey: 'PB-2026-00452',
            technicianId: 'tech-juan-perez',
            technicianName: 'Ing. Juan Pérez',
            startedAt: '2026-10-06T14:10:00Z',
            completedAt: '2026-10-06T15:20:00Z',
            syncedAt: '2026-10-07T09:42:00Z',
            status: 'COMPLETADA',
            syncStatus: 'SYNCED',
            startLat: 19.043,
            startLon: -99.982,
            startAccuracyM: 10.0,
            geofenceValid: true,
            geofenceDistanceM: 15.0,
            samplingUnits: [],
            evidenceCount: 5,
            idempotencyKey: 'key-452',
          },
          {
            id: 'audit-00453',
            plotId: 'plot-pb-00453',
            plotCadastralKey: 'PB-2026-00453',
            technicianId: 'tech-juan-perez',
            technicianName: 'Ing. Juan Pérez',
            startedAt: '2026-10-07T08:00:00Z',
            status: 'GUARDADA_LOCALMENTE',
            syncStatus: 'PENDING',
            startLat: 19.037,
            startLon: -100.042,
            startAccuracyM: 14.0,
            geofenceValid: true,
            geofenceDistanceM: 20.0,
            samplingUnits: [],
            evidenceCount: 4,
            idempotencyKey: 'key-453',
          },
          {
            id: 'audit-00454',
            plotId: 'plot-pb-00454',
            plotCadastralKey: 'PB-2026-00454',
            technicianId: 'tech-juan-perez',
            technicianName: 'Ing. Juan Pérez',
            startedAt: '2026-10-07T10:30:00Z',
            completedAt: '2026-10-07T11:45:00Z',
            status: 'CON_INCIDENCIA',
            syncStatus: 'SYNCED',
            startLat: 19.188,
            startLon: -100.121,
            startAccuracyM: 34.0,
            geofenceValid: true,
            geofenceDistanceM: 45.0,
            hasGpsWarning: true,
            samplingUnits: [],
            evidenceCount: 6,
            idempotencyKey: 'key-454',
          },
        ];
        await db.audits.bulkAdd(sampleAudits);
        setAudits(sampleAudits);
      } else {
        setAudits(allAudits);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Editorial Header */}
      <div className="border-b border-[#6B8B78]/20 pb-4">
        <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-['Outfit',sans-serif] text-2xl font-light text-[#1B2A24] flex items-center gap-2">
              <History className="w-5 h-5 text-[#355044]" />
              <span>Historial de Auditorías</span>
            </h1>
            <p className="text-xs text-[#6B8B78] mt-0.5">
              Registro inmutable de levantamientos en campo
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-[#355044] bg-[#EAE4D3] px-3 py-1 rounded-full font-medium shadow-inner">
            <Lock className="w-3.5 h-3.5 text-[#355044]" />
            <span>Inmutable</span>
          </span>
        </div>
      </div>

      {/* Audit list stream */}
      <div className="space-y-3">
        {audits.map((a) => {
          const plotData = plots[a.plotId];
          return (
            <div
              key={a.id}
              className="rounded-[22px] bg-[#EAE4D3] p-4 border border-[#6B8B78]/15 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#355044] bg-[#D9D1B8] px-2.5 py-0.5 rounded-full text-xs">
                    {a.plotCadastralKey || plotData?.cadastralKey || a.plotId}
                  </span>
                  <span className="font-medium text-[#1B2A24] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#6B8B78]" />
                    {plotData?.municipality || 'Estado de México'}
                  </span>
                </div>
                <p className="text-[#6B8B78] text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-[#6B8B78]" />
                  <span>
                    Iniciado: {new Date(a.startedAt).toLocaleDateString()} {new Date(a.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[#6B8B78]/40">·</span>
                  <span>{a.evidenceCount} evidencias</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {a.syncStatus === 'SYNCED' && a.status !== 'CON_INCIDENCIA' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5ECE3] text-[#355044] font-semibold text-xs shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
                    <span>Sincronizada</span>
                  </span>
                ) : a.status === 'CON_INCIDENCIA' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F9EDE8] text-[#9A381E] font-semibold text-xs shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E0643A]" />
                    <span>Incidencia (GPS &gt; 30m)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9D1B8] text-[#1B2A24] font-semibold text-xs shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#6B8B78]" />
                    <span>Guardada Local</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Architectural Guarantee Note */}
      <div className="rounded-2xl bg-[#EAE4D3]/70 p-3.5 border border-[#6B8B78]/15 text-xs text-[#6B8B78] leading-relaxed shadow-inner">
        Las auditorías originales son inmutables y no pueden eliminarse desde la vista móvil. Cualquier observación complementaria genera un evento de revisión criptográfico en el servidor.
      </div>
    </div>
  );
}
