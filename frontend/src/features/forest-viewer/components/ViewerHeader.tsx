import React from 'react';
import { TreePine, Menu, BookOpen } from 'lucide-react';
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
    <header className="h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebarMobile}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white lg:hidden transition-colors"
          title="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
            <TreePine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight">
                PROBOSQUE <span className="font-light text-emerald-400">| Visor Forestal</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                Edomex
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Monitoreo Multitemporal de Cobertura y Uso del Suelo (2010–2025)
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls & Navigation */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300">
          <span className="text-slate-400">Región:</span>
          <strong className="text-emerald-400">{selectedMuniName}</strong>
        </div>

        <button
          onClick={onOpenMetadataModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs text-slate-200 border border-slate-700/50 transition-all shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Metodología & Fuentes</span>
        </button>

        <Link
          to="/login"
          className="text-[11px] text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors hidden sm:block"
          title="Acceso administrativo institucional"
        >
          Acceso Técnico
        </Link>
      </div>
    </header>
  );
};
