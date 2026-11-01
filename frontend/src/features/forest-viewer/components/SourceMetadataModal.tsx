import React from 'react';
import { X, ShieldCheck, Database, BookOpen, Layers } from 'lucide-react';
import type { ForestMetadata } from '../types/forest';

interface SourceMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ForestMetadata | null;
}

export const SourceMetadataModal: React.FC<SourceMetadataModalProps> = ({ isOpen, onClose, metadata }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Fuentes, Metodología y Licenciamiento</h2>
              <p className="text-xs text-slate-400">Visor Forestal Multitemporal del Estado de México — Probosque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: MapBiomas */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">MapBiomas México — Colección 1.0</h3>
              </div>
              <span className="font-mono text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                CC BY-SA 4.0
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Mapas anuales homogéneos de cobertura y uso del suelo generados con mosaicos Landsat de 30 metros mediante aprendizaje automático sobre Google Earth Engine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <strong className="text-slate-200">Asset GEE:</strong>{' '}
                <span className="font-mono text-[10px] text-emerald-400 break-all">
                  projects/mapbiomas-public/assets/mexico/lulc/collection1/mapbiomas_mexico_collection1_coverage_v1
                </span>
              </div>
              <div>
                <strong className="text-slate-200">Alcance temporal:</strong> 1985–2025 (MVP: 2010–2025)
              </div>
              <div>
                <strong className="text-slate-200">Resolución:</strong> 30 metros por píxel
              </div>
              <div>
                <strong className="text-slate-200">Atribución:</strong> MapBiomas México Colección 1.0
              </div>
            </div>
          </div>

          {/* Section 2: Hansen GFC */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-sm text-white">Hansen Global Forest Change (v1.13)</h3>
              </div>
              <span className="font-mono text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded">
                CC BY 4.0
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Monitoreo satelital global de la dinámica forestal (Universidad de Maryland / Google). Cuantifica la pérdida anual bruta de dosel arbóreo (canopy disturbance).
            </p>
            <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg text-rose-200 text-[11px] leading-relaxed">
              <strong>Importante:</strong> La pérdida bruta de cobertura arbórea NO equivale automáticamente a deforestación permanente, cambio de uso de suelo ni pérdida neta de masa boscosa.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <strong className="text-slate-200">Asset GEE:</strong>{' '}
                <span className="font-mono text-[10px] text-rose-400 break-all">
                  UMD/hansen/global_forest_change_2025_v1_13
                </span>
              </div>
              <div>
                <strong className="text-slate-200">Umbral de dosel:</strong> ≥ 30% cobertura de copa
              </div>
            </div>
          </div>

          {/* Section 3: INEGI Marco Geoestadístico */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-white">INEGI — Marco Geoestadístico Integrado</h3>
              </div>
              <span className="font-mono text-[10px] bg-sky-950 text-sky-400 border border-sky-800 px-2 py-0.5 rounded">
                Libre Uso MX
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Delimitación administrativa oficial del Estado de México y sus 125 municipios (versión diciembre 2023, UPC 794551067314), re-proyectada a WGS84 con superficies geodésicas calculadas en PostGIS.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <strong className="text-slate-200">Municipios oficiales:</strong> 125 (Claves 15001 a 15125)
              </div>
              <div>
                <strong className="text-slate-200">Superficie estatal:</strong> 2,235,175.16 hectáreas
              </div>
            </div>
          </div>

          {/* Section 4: Leyenda Oficial */}
          {metadata?.legend_classes && (
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Leyenda Oficial de Cobertura y Uso del Suelo (15 Clases)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {metadata.legend_classes.map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]"
                  >
                    <span className="w-3.5 h-3.5 rounded shrink-0" style={{ backgroundColor: c.hex_color }} />
                    <div className="truncate">
                      <span className="block font-medium text-slate-200 truncate">{c.name_es}</span>
                      <span className="text-[9px] font-mono text-slate-500">Cód. {c.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Gobierno del Estado de México • Probosque 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
