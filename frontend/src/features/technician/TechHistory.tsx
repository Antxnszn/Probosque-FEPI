import { useState, useEffect } from 'react';
import { History, CheckCircle2, Clock, AlertTriangle, Lock } from 'lucide-react';
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
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-forest-400" />
              Historial de Auditorías Realizadas
            </h1>
            <p className="text-xs text-slate-400">
              Registro inmutable de levantamientos en campo
            </p>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <Lock className="w-3.5 h-3.5 text-slate-500" /> Inmutable
          </span>
        </div>

        {/* Audit list matching section 3.8 */}
        <div className="space-y-2.5">
          {audits.map((a) => {
            const plotData = plots[a.plotId];
            return (
              <div
                key={a.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-forest-400 bg-forest-950/80 px-2 py-0.5 rounded border border-forest-800">
                      {a.plotCadastralKey || plotData?.cadastralKey || a.plotId}
                    </span>
                    <span className="font-semibold text-white">
                      {plotData?.municipality || 'Estado de México'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Iniciado: {new Date(a.startedAt).toLocaleDateString()} {new Date(a.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {a.syncStatus === 'SYNCED' && a.status !== 'CON_INCIDENCIA' ? (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizada
                    </span>
                  ) : a.status === 'CON_INCIDENCIA' ? (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Incidencia (GPS &gt; 30m)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold text-[11px]">
                      <Clock className="w-3.5 h-3.5" /> Guardada Local
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-500 italic">
          * Regla arquitectónica 4: Las auditorías originales son inmutables y no pueden eliminarse desde la vista móvil. Cualquier corrección genera un evento de revisión.
        </div>
      </div>
    </div>
  );
}
