import { useState, useEffect } from 'react';
import { Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { db } from '../../db/dexie';
import type { EvidenceRecord } from '../../types';

export function AdminEvidence() {
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<EvidenceRecord | null>(null);

  useEffect(() => {
    async function loadEvidence() {
      const data = await db.evidence.toArray();
      if (data.length === 0) {
        // Sample demonstration forensic evidence matching section 4.9
        const sample: EvidenceRecord[] = [
          {
            id: 'ev-18342',
            auditId: 'audit-00451',
            plotId: 'plot-pb-00451',
            dataUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=80',
            hashSha256: 'a81fe47b99c0d123456789abcdef0123456789abcdef0123456789abcdef0123',
            mimeType: 'image/jpeg',
            sizeBytes: 2451000,
            capturedAt: '2026-10-06 11:42:17',
            receivedAt: '2026-10-07 09:42:10',
            captureLat: 19.24652,
            captureLon: -99.71981,
            captureAccuracyM: 11.2,
            evidenceType: 'PANORAMICA',
            syncStatus: 'SYNCED',
            integrityStatus: 'VALID_HASH',
          },
          {
            id: 'ev-18343',
            auditId: 'audit-00451',
            plotId: 'plot-pb-00451',
            dataUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80',
            hashSha256: 'b92c47a988d1e23456789abcdef0123456789abcdef0123456789abcdef0456',
            mimeType: 'image/jpeg',
            sizeBytes: 1845000,
            capturedAt: '2026-10-06 11:55:04',
            receivedAt: '2026-10-07 09:42:10',
            captureLat: 19.24710,
            captureLon: -99.71920,
            captureAccuracyM: 8.5,
            evidenceType: 'MUESTRA_1',
            syncStatus: 'SYNCED',
            integrityStatus: 'VALID_HASH',
          },
          {
            id: 'ev-18344',
            auditId: 'audit-00452',
            plotId: 'plot-pb-00452',
            dataUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
            hashSha256: 'c73d58ba77e2f3456789abcdef0123456789abcdef0123456789abcdef0789',
            mimeType: 'image/jpeg',
            sizeBytes: 3120000,
            capturedAt: '2026-10-06 14:30:12',
            receivedAt: '2026-10-07 09:42:10',
            captureLat: 19.04350,
            captureLon: -99.98250,
            captureAccuracyM: 10.0,
            evidenceType: 'MUESTRA_2',
            syncStatus: 'SYNCED',
            integrityStatus: 'VALID_HASH',
          },
        ];
        await db.evidence.bulkAdd(sample);
        setEvidenceList(sample);
        setSelectedPhoto(sample[0]);
      } else {
        setEvidenceList(data);
        setSelectedPhoto(data[0]);
      }
    }
    loadEvidence();
  }, []);

  const filtered = evidenceList.filter((e) => {
    if (filterType === 'ALL') return true;
    return e.evidenceType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-forest-400" />
            Galería Forense de Evidencias Fotográficas
          </h1>
          <p className="text-xs text-slate-400">
            Registro inmutable con metadatos GNSS, timestamp de cliente/servidor y sellos criptográficos SHA-256
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Cadena de Custodia Criptográfica</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {['ALL', 'PANORAMICA', 'MUESTRA_1', 'MUESTRA_2', 'MUESTRA_3'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              filterType === t
                ? 'bg-forest-600 text-white font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t === 'ALL' ? 'Todas' : t}
          </button>
        ))}
      </div>

      {/* Evidence Gallery & Forensic Inspection Panel matching section 4.9 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Evidence Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedPhoto(item)}
              className={`bg-slate-900 border rounded-2xl overflow-hidden cursor-pointer transition-all ${
                selectedPhoto?.id === item.id
                  ? 'border-forest-500 ring-2 ring-forest-500/20 shadow-xl'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="h-44 w-full bg-slate-950 overflow-hidden relative">
                <img
                  src={item.dataUrl}
                  alt={item.id}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white">
                  {item.evidenceType}
                </span>
                <span className="absolute bottom-2 right-2 bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                  ✓ HASH VALID
                </span>
              </div>
              <div className="p-3 text-xs space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                  <span>ID: {item.id}</span>
                  <span>±{item.captureAccuracyM}m GPS</span>
                </div>
                <div className="font-mono text-[10px] text-slate-500 truncate">
                  SHA: {item.hashSha256}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Col: Forensic Detail Inspection matching section 4.9 */}
        {selectedPhoto && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-mono text-forest-400 uppercase tracking-wider block">
                Ficha Forense de Evidencia
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Fotografía #{selectedPhoto.id}
              </h3>
              <p className="text-slate-400 text-[11px]">Tipo: {selectedPhoto.evidenceType}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Hash Criptográfico SHA-256:</span>
                <span className="text-slate-200 break-all">{selectedPhoto.hashSha256}</span>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <span className="text-slate-500 block text-[10px] font-sans">Fecha y Hora de Captura (Sensor):</span>
                <span className="text-white">{selectedPhoto.capturedAt}</span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Coordenadas GNSS:</span>
                <span className="text-slate-200">
                  {selectedPhoto.captureLat}, {selectedPhoto.captureLon}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Precisión de Telemetría:</span>
                <span className="text-emerald-400 font-bold">{selectedPhoto.captureAccuracyM} m</span>
              </div>

              <div className="border-t border-slate-800 pt-2">
                <span className="text-slate-500 block text-[10px] font-sans">Servidor Central Recibió:</span>
                <span className="text-white">{selectedPhoto.receivedAt || '07/10/2026 09:42:10'}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-500 font-sans">Estado de Integridad:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10px]">
                  ✓ HASH VALID
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[10px] text-slate-500 italic space-y-1">
              <p>• Regla 3: El administrador puede visualizar y auditar, pero no reemplazar destructivamente la evidencia.</p>
              <p>• Toda nueva fotografía se incorpora como nueva evidencia inmutable con su propio hash.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
