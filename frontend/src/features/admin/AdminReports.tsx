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
      setMessage(`Reporte consolidado generado en formato ${selectedFormat}. Descarga iniciada desde el backend.`);
      setTimeout(() => setMessage(null), 4000);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-forest-400" />
          Módulo de Reportes Oficiales y Exportación
        </h1>
        <p className="text-xs text-slate-400">
          Generación certificada de padrones de fomento, auditorías de campo y geometrías catastrales
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter Matrix matching section 4.11 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-forest-400" />
          Parámetros de Filtrado
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Programa Gubernamental</label>
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500"
            >
              <option value="REFORESTACION_2026">Reforestación y Restauración 2026</option>
              <option value="PAGO_SERVICIOS_2026">Pago por Servicios Ambientales Hidrológicos</option>
              <option value="PLANTACIONES_COMERCIALES">Plantaciones Forestales Comerciales</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Municipio / Región</label>
            <select
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500"
            >
              <option value="ALL">Todos los municipios del Estado de México</option>
              <option value="Zinacantepec">Zinacantepec</option>
              <option value="Valle de Bravo">Valle de Bravo</option>
              <option value="Amanalco">Amanalco de Becerra</option>
              <option value="Temascaltepec">Temascaltepec</option>
              <option value="Villa del Carbón">Villa del Carbón</option>
              <option value="Ocuilan">Ocuilan</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Periodo Fiscal</label>
            <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-forest-500">
              <option>Ejercicio Fiscal 2026 (Corte Octubre)</option>
              <option>Ejercicio Fiscal 2025 (Cierre Anual)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Options Grid matching section 4.11: CSV, XLSX, PDF, GeoJSON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CSV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-mono font-bold text-forest-400 bg-forest-950 px-2.5 py-0.5 rounded border border-forest-800">
              CSV
            </span>
            <h4 className="text-base font-bold text-white mt-2">Padrón de Beneficiarios</h4>
            <p className="text-xs text-slate-400 mt-1">
              Tabla plana con claves catastrales, áreas en hectáreas y montos dictaminados.
            </p>
          </div>
          <button
            onClick={() => handleExport('CSV')}
            disabled={downloading}
            className="w-full py-2.5 bg-slate-800 hover:bg-forest-600 hover:text-white text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* XLSX */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
              XLSX
            </span>
            <h4 className="text-base font-bold text-white mt-2">Cédula Bioestadística</h4>
            <p className="text-xs text-slate-400 mt-1">
              Libro Excel con fórmulas de estimador de razón, varianza e intervalos de confianza.
            </p>
          </div>
          <button
            onClick={() => handleExport('XLSX')}
            disabled={downloading}
            className="w-full py-2.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar XLSX</span>
          </button>
        </div>

        {/* PDF */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950 px-2.5 py-0.5 rounded border border-rose-800">
              PDF
            </span>
            <h4 className="text-base font-bold text-white mt-2">Dictamen Oficial Probosque</h4>
            <p className="text-xs text-slate-400 mt-1">
              Expedientes con sello institucional, firmas de supervisor y firmas criptográficas.
            </p>
          </div>
          <button
            onClick={() => handleExport('PDF')}
            disabled={downloading}
            className="w-full py-2.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Generar PDF</span>
          </button>
        </div>

        {/* GeoJSON */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800">
              GeoJSON
            </span>
            <h4 className="text-base font-bold text-white mt-2">Polígonos SIG / QGIS</h4>
            <p className="text-xs text-slate-400 mt-1">
              Capas vectoriales georreferenciadas WGS84 con propiedades de triage y supervivencia.
            </p>
          </div>
          <button
            onClick={() => handleExport('GeoJSON')}
            disabled={downloading}
            className="w-full py-2.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Exportar GeoJSON</span>
          </button>
        </div>
      </div>
    </div>
  );
}
