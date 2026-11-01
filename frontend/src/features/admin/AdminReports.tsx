import { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export function AdminReports() {
  const [municipality, setMunicipality] = useState('ALL');
  const [program, setProgram] = useState('REFORESTACION_2026');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport(selectedFormat: 'CSV' | 'XLSX' | 'PDF' | 'GeoJSON') {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setMessage(`Reporte consolidado generado en formato ${selectedFormat}. Descarga iniciada.`);
      setTimeout(() => setMessage(null), 4000);
    }, 1200);
  }

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif] text-[#1B2A24]">
      {/* Header */}
      <div className="border-b border-[#6B8B78]/20 pb-4">
        <div className="w-8 h-1 rounded-full bg-[#E0643A] mb-2" />
        <h1 className="font-['Outfit',sans-serif] text-3xl font-light text-[#1B2A24] flex items-center gap-2.5">
          <FileSpreadsheet className="w-6 h-6 text-[#355044]" />
          <span>Informes Oficiales y Exportación</span>
        </h1>
        <p className="text-sm text-[#6B8B78] mt-1">
          Generación institucional de padrones de fomento, actas de auditoría in situ y capas vectoriales
        </p>
      </div>

      {message && (
        <div className="p-4 bg-[#B9C8B2]/50 border border-[#355044]/30 rounded-2xl text-xs text-[#1B2A24] flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-[#355044]" />
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* Recessed Clay Filter Well */}
      <div className="rounded-[28px] bg-[#EAE4D3] p-6 shadow-[inset_4px_4px_10px_rgba(107,139,120,0.18),inset_-4px_-4px_10px_rgba(255,255,255,0.85)] space-y-4 text-xs">
        <h3 className="font-['Outfit',sans-serif] text-base font-medium text-[#1B2A24] flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#355044]" />
          <span>Criterios de Agrupamiento y Corte</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[#6B8B78] font-semibold mb-1.5">Programa de Conservación</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full bg-[#F4F1EA] rounded-full px-4 py-2.5 text-[#1B2A24] focus:outline-none shadow-inner"
            >
              <option value="REFORESTACION_2026">Reforestación y Restauración Integral 2026</option>
              <option value="PAGO_SERVICIOS_2026">Pago por Servicios Ambientales Hidrológicos</option>
              <option value="PLANTACIONES_COMERCIALES">Plantaciones Forestales Sustentables</option>
            </select>
          </div>

          <div>
            <label className="block text-[#6B8B78] font-semibold mb-1.5">Municipio o Región Forestal</label>
            <select
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              className="w-full bg-[#F4F1EA] rounded-full px-4 py-2.5 text-[#1B2A24] focus:outline-none shadow-inner"
            >
              <option value="ALL">Todo el Estado de México (125 Municipios)</option>
              <option value="Zinacantepec">Zinacantepec</option>
              <option value="Valle de Bravo">Valle de Bravo</option>
              <option value="Amanalco">Amanalco de Becerra</option>
              <option value="Temascaltepec">Temascaltepec</option>
              <option value="Villa del Carbón">Villa del Carbón</option>
              <option value="Ocuilan">Ocuilan</option>
            </select>
          </div>

          <div>
            <label className="block text-[#6B8B78] font-semibold mb-1.5">Ejercicio Presupuestal</label>
            <select className="w-full bg-[#F4F1EA] rounded-full px-4 py-2.5 text-[#1B2A24] focus:outline-none shadow-inner">
              <option>Ejercicio Fiscal 2026 (Corte Vigente)</option>
              <option>Ejercicio Fiscal 2025 (Cierre Anual)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CSV */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
              Formato CSV
            </span>
            <h4 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] mt-2">
              Padrón de Beneficiarios
            </h4>
            <p className="text-xs text-[#6B8B78] leading-relaxed">
              Matriz tabular con claves catastrales, hectáreas elegibles y montos dictaminados.
            </p>
          </div>
          <button
            onClick={() => handleExport('CSV')}
            disabled={downloading}
            className="w-full py-2.5 bg-[#D9D1B8] hover:bg-[#355044] hover:text-white text-[#1B2A24] rounded-full text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar CSV</span>
          </button>
        </div>

        {/* XLSX */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
              Formato XLSX
            </span>
            <h4 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] mt-2">
              Cédula Bioestadística
            </h4>
            <p className="text-xs text-[#6B8B78] leading-relaxed">
              Libro analítico con estimadores de razón Cochran e intervalos de confianza t-Student.
            </p>
          </div>
          <button
            onClick={() => handleExport('XLSX')}
            disabled={downloading}
            className="w-full py-2.5 bg-[#D9D1B8] hover:bg-[#355044] hover:text-white text-[#1B2A24] rounded-full text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar XLSX</span>
          </button>
        </div>

        {/* PDF */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#E0643A] bg-[#F9DFD5] px-3 py-1 rounded-full">
              Formato PDF
            </span>
            <h4 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] mt-2">
              Dictamen Oficial Certificado
            </h4>
            <p className="text-xs text-[#6B8B78] leading-relaxed">
              Expedientes membretados con sellos institucionales y firmas de dictaminación.
            </p>
          </div>
          <button
            onClick={() => handleExport('PDF')}
            disabled={downloading}
            className="clay-btn-terracotta w-full py-2.5 text-xs text-white shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>
        </div>

        {/* GeoJSON */}
        <div className="rounded-[28px] bg-[#EAE4D3] border border-[#6B8B78]/15 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#355044] bg-[#D9D1B8] px-3 py-1 rounded-full">
              Formato GeoJSON
            </span>
            <h4 className="font-['Outfit',sans-serif] text-lg font-medium text-[#1B2A24] mt-2">
              Capas Vectoriales SIG
            </h4>
            <p className="text-xs text-[#6B8B78] leading-relaxed">
              Polígonos georreferenciados en WGS84 para visualización en QGIS o ArcGIS.
            </p>
          </div>
          <button
            onClick={() => handleExport('GeoJSON')}
            disabled={downloading}
            className="w-full py-2.5 bg-[#D9D1B8] hover:bg-[#355044] hover:text-white text-[#1B2A24] rounded-full text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar GeoJSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
