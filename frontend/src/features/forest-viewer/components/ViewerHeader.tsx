import React from 'react';
import { TreePine, Menu, BookOpen, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ViewerHeaderProps {
  onToggleSidebarMobile: () => void;
  onOpenMetadataModal: () => void;
  selectedMuniName: string;
}

export const ViewerHeader: React.FC<ViewerHeaderProps> = ({
  onToggleSidebarMobile,
  onOpenMetadataModal,
  selectedMuniName,
}) => {
  return (
    <header className="h-20 bg-[#EAE4D3]/90 backdrop-blur-md border-b border-[#6B8B78]/20 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-20 shadow-[0_4px_16px_rgba(27,42,36,0.03)] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Brand & Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onToggleSidebarMobile}
          className="p-2.5 rounded-2xl bg-[#D9D1B8] text-[#1B2A24] hover:bg-[#B9C8B2] lg:hidden transition-colors shadow-sm"
          title="Abrir panel de control"
          aria-label="Abrir panel de control"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#355044] text-[#F4F1EA] flex items-center justify-center shadow-[4px_6px_14px_rgba(27,42,36,0.18),inset_2px_2px_4px_rgba(185,200,178,0.3),inset_-2px_-3px_5px_rgba(15,25,21,0.5)]">
            <TreePine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit',sans-serif] text-lg font-semibold tracking-tight text-[#1B2A24]">
                PROBOSQUE
              </span>
              <span className="text-xs text-[#6B8B78]">·</span>
              <span className="font-['Outfit',sans-serif] text-sm font-normal text-[#355044]">
                Visor Forestal Multitemporal
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#D9D1B8] text-[#355044]">
                Edomex
              </span>
            </div>
            <p className="text-xs text-[#6B8B78] hidden sm:block">
              Monitoreo Satelital de Cobertura y Uso del Suelo (2010–2025)
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls & Navigation */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-[#D9D1B8] rounded-full text-xs font-medium text-[#1B2A24] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.7),inset_-1px_-1px_2px_rgba(107,139,120,0.18)]">
          <span className="w-2 h-2 rounded-full bg-[#A3C962]" />
          <span className="text-[#6B8B78]">Región activa:</span>
          <strong className="text-[#1B2A24] font-semibold">{selectedMuniName}</strong>
        </div>

        <button
          onClick={onOpenMetadataModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#D9D1B8] hover:bg-[#B9C8B2] text-xs font-medium text-[#1B2A24] shadow-[4px_6px_12px_rgba(27,42,36,0.06),-2px_-2px_6px_rgba(255,255,255,0.7),inset_1px_1px_3px_rgba(255,255,255,0.6)] transition-all"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#355044]" />
          <span className="hidden sm:inline">Metodología y Fuentes</span>
        </button>

        <Link
          to="/login"
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#EB7147] to-[#D95B30] px-4 py-2 text-xs font-semibold text-white shadow-[6px_10px_20px_rgba(224,100,58,0.28),inset_2px_2px_5px_rgba(255,215,195,0.55),inset_-2px_-3px_6px_rgba(148,52,20,0.4)] hover:-translate-y-0.5 transition-all"
          title="Acceso técnico institucional"
        >
          <User className="w-3.5 h-3.5" />
          <span>Acceso Institucional</span>
        </Link>
      </div>
    </header>
  );
};
