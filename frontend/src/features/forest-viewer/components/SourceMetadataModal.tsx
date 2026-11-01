import React from 'react';
import { X, Database, BookOpen, Layers } from 'lucide-react';
import type { ForestMetadata } from '../types/forest';

interface SourceMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ForestMetadata | null;
}

export const SourceMetadataModal: React.FC<SourceMetadataModalProps> = ({ isOpen, onClose, metadata: _metadata }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B2A24]/60 backdrop-blur-sm animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#F4F1EA] border border-[#6B8B78]/25 rounded-[32px] shadow-[0_20px_50px_rgba(27,42,36,0.25)] flex flex-col overflow-hidden text-[#1B2A24]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#6B8B78]/20 flex items-center justify-between bg-[#EAE4D3]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Outfit',sans-serif] text-lg font-semibold text-[#1B2A24]">
                Fuentes, Metodología y Licenciamiento
              </h2>
              <p className="text-xs text-[#6B8B78]">
                Visor Forestal Multitemporal del Estado de México · PROBOSQUE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#355044] hover:bg-[#D9D1B8] transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-xs text-[#1B2A24]">
          {/* Section 1: MapBiomas */}
          <div className="rounded-2xl bg-[#EAE4D3] p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-[#355044]" />
                <h3 className="font-['Outfit',sans-serif] text-sm font-semibold text-[#1B2A24]">
                  MapBiomas México · Colección 1.0
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-[#B9C8B2] text-[#1B2A24] px-2.5 py-0.5 rounded-full">
                CC BY-SA 4.0
              </span>
            </div>
            <p className="text-[#6B8B78] leading-relaxed text-xs">
              Mosaicos satelitales anuales de cobertura y uso del suelo generados con sensores Landsat a 30 metros de resolución mediante modelos supervisados en Google Earth Engine.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-[#6B8B78]/15">
              <div>
                <strong className="text-[#355044]">Resolución:</strong> 30 metros por píxel
              </div>
              <div>
                <strong className="text-[#355044]">Alcance temporal:</strong> 1985–2025 (MVP: 2010–2025)
              </div>
              <div>
                <strong className="text-[#355044]">Atribución:</strong> Iniciativa MapBiomas México
              </div>
              <div>
                <strong className="text-[#355044]">Uso oficial:</strong> Monitoreo de macizos boscosos
              </div>
            </div>
          </div>

          {/* Section 2: Hansen GFC */}
          <div className="rounded-2xl bg-[#EAE4D3] p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-[#E0643A]" />
                <h3 className="font-['Outfit',sans-serif] text-sm font-semibold text-[#1B2A24]">
                  Hansen Global Forest Change (v1.13)
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-[#F9DFD5] text-[#E0643A] px-2.5 py-0.5 rounded-full">
                CC BY 4.0
              </span>
            </div>
            <p className="text-[#6B8B78] leading-relaxed text-xs">
              Monitoreo satelital global de la dinámica forestal elaborado por la Universidad de Maryland y Google. Registra eventos anuales de pérdida bruta de dosel arbóreo.
            </p>
            <div className="rounded-xl bg-[#F9DFD5]/70 p-3 text-xs text-[#E0643A] leading-relaxed border border-[#E0643A]/20">
              <strong>Nota metodológica:</strong> La pérdida bruta de dosel arbóreo no equivale necesariamente a deforestación permanente o cambio ilícito de uso de suelo; incluye podas de saneamiento y dinámica fenológica.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-[#6B8B78]/15">
              <div>
                <strong className="text-[#355044]">Umbral de dosel:</strong> Mayor o igual al 30%
              </div>
              <div>
                <strong className="text-[#355044]">Cita científica:</strong> Hansen et al. (Science 342)
              </div>
            </div>
          </div>

          {/* Section 3: INEGI Cartography */}
          <div className="rounded-2xl bg-[#EAE4D3] p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-[#355044]" />
                <h3 className="font-['Outfit',sans-serif] text-sm font-semibold text-[#1B2A24]">
                  Cartografía Vectorial INEGI (Marco Geoestadístico 2024)
                </h3>
              </div>
              <span className="text-[11px] font-semibold bg-[#B9C8B2] text-[#1B2A24] px-2.5 py-0.5 rounded-full">
                Datos Abiertos
              </span>
            </div>
            <p className="text-[#6B8B78] leading-relaxed text-xs">
              Límites municipales oficiales de los 125 municipios del Estado de México simplificados con tolerancia topológica de 0.001 grados (aproximadamente 100m) para garantizar rendimiento fluido en navegadores web y dispositivos móviles.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#6B8B78]/20 bg-[#EAE4D3] flex items-center justify-between">
          <span className="text-xs text-[#6B8B78]">PROBOSQUE · Protectora de Bosques del Estado de México</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#355044] hover:bg-[#1B2A24] text-white text-xs font-semibold shadow-sm transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
