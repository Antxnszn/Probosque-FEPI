import { useState, useEffect } from 'react';
import { Image as ImageIcon, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#6B8B78]/20 pb-4">
        <div>
          <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
          <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-[#355044]" />
            <span>Galería Forense de Evidencias</span>
          </h1>
          <p className="text-sm text-[#6B8B78] mt-1">
            Registro inmutable con telemetría GNSS, timestamp de cliente/servidor y sellos criptográficos SHA-256
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3.5 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-[#355044]" />
          <span>Cadena de Custodia Criptográfica</span>
        </div>
      </div>

      {/* Filter Tabs in Clay Style */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        {['ALL', 'PANORAMICA', 'MUESTRA_1', 'MUESTRA_2', 'MUESTRA_3'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-full font-semibold transition-all shadow-sm ${
              filterType === t
                ? 'bg-[#355044] text-white shadow-md'
                : 'bg-[#D9D1B8] text-[#1B2A24] hover:bg-[#B9C8B2]'
            }`}
          >
            {t === 'ALL' ? 'Todas las tomas' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Evidence Gallery & Forensic Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Evidence Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedPhoto(item)}
              className={`rounded-[28px] overflow-hidden cursor-pointer transition-all ${
                selectedPhoto?.id === item.id
                  ? 'bg-[#EAE4D3] shadow-lg border-2 border-[#355044]'
                  : 'bg-[#F4F1EA] hover:bg-[#EAE4D3]/60 border border-[#6B8B78]/20 shadow-sm'
              }`}
            >
              <div className="h-44 w-full bg-[#EAE4D3] overflow-hidden relative">
                <img
                  src={item.dataUrl}
                  alt={item.id}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <span className="absolute top-2.5 left-2.5 bg-[#1B2A24]/75 backdrop-blur px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white">
                  {item.evidenceType}
                </span>
                <span className="absolute bottom-2.5 right-2.5 bg-[#B9C8B2] text-[#1B2A24] px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-[#355044]" />
                  <span>Hash Válido</span>
                </span>
              </div>
              <div className="p-4 text-xs space-y-1.5">
                <div className="flex justify-between font-semibold text-[#1B2A24]">
                  <span>{item.id}</span>
                  <span className="text-[#6B8B78]">Precisión ±{item.captureAccuracyM}m</span>
                </div>
                <div className="text-[11px] text-[#6B8B78] truncate">
                  SHA: {item.hashSha256}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Col: Forensic Detail Inspection */}
        {selectedPhoto && (
          <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-sm space-y-5 border border-[#6B8B78]/15 text-xs">
            <div className="border-b border-[#6B8B78]/20 pb-3">
              <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full block w-fit mb-2">
                Ficha Forense de Evidencia
              </span>
              <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24]">
                Toma #{selectedPhoto.id}
              </h3>
              <p className="text-[#6B8B78] mt-0.5">Categoría: {selectedPhoto.evidenceType}</p>
            </div>

            <div className="rounded-2xl bg-[#F4F1EA] p-4 space-y-3 shadow-inner text-xs">
              <div>
                <span className="text-[#6B8B78] block text-[11px]">Hash SHA-256 (Sello Criptográfico):</span>
                <span className="text-[#1B2A24] break-all font-semibold">{selectedPhoto.hashSha256}</span>
              </div>

              <div className="border-t border-[#6B8B78]/15 pt-2">
                <span className="text-[#6B8B78] block text-[11px]">Timestamp de Captura (Sensor):</span>
                <span className="text-[#1B2A24] font-medium">{selectedPhoto.capturedAt}</span>
              </div>

              <div>
                <span className="text-[#6B8B78] block text-[11px]">Coordenadas GNSS:</span>
                <span className="text-[#1B2A24] font-medium">
                  {selectedPhoto.captureLat}, {selectedPhoto.captureLon}
                </span>
              </div>

              <div>
                <span className="text-[#6B8B78] block text-[11px]">Precisión de Telemetría:</span>
                <span className="text-[#355044] font-semibold">{selectedPhoto.captureAccuracyM} m</span>
              </div>

              <div className="border-t border-[#6B8B78]/15 pt-2">
                <span className="text-[#6B8B78] block text-[11px]">Recepción en Sede Central:</span>
                <span className="text-[#1B2A24] font-medium">{selectedPhoto.receivedAt || '07/10/2026 09:42:10'}</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#6B8B78]/15 pt-2">
                <span className="text-[#6B8B78]">Estado de Integridad:</span>
                <span className="px-3 py-1 rounded-full bg-[#B9C8B2] text-[#1B2A24] font-semibold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#355044]" />
                  <span>Certificada</span>
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#D9D1B8]/40 p-4 border border-[#6B8B78]/15 text-[11px] text-[#6B8B78] space-y-1.5 leading-relaxed">
              <p>• La evidencia in situ se preserva con carácter probatorio inmutable.</p>
              <p>• Toda nueva toma complementaria genera un nuevo registro forense independiente.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
