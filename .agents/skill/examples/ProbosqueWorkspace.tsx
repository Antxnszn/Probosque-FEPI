import React, { useState } from 'react';

/**
 * PROBOSQUE UI/UX PRO — KIT DE COMPONENTES REACT + TAILWIND CSS
 * Estilo: Claymorfismo Botánico Sin Tarjetas (Cardless Claymorphism)
 * Paleta: #1B2A24, #355044, #6B8B78, #B9C8B2, #D9D1B8 + Acento Extra #E0643A (Terracota Resina)
 * Prohibido: Fuentes monospace, barras azul marino, etiquetas tipo píldora estáticas y cuadrículas de tarjetas.
 */

export const ProbosqueWorkspace: React.FC = () => {
  const [selectedScope, setSelectedScope] = useState('Acervo Estatal Completo (10 expedientes)');
  const [query, setQuery] = useState('');

  const metrics = [
    { value: '+24%', label: 'Incremento en reforestación activa', accent: false },
    { value: '14,800 ha', label: 'Superficie bajo manejo sustentable', accent: false },
    { value: '10', label: 'Expedientes técnicos verificados', accent: true },
  ];

  const expedientes = [
    {
      id: 'pb-01',
      title: 'Programa de Restauración Hidrológico-Forestal 2026',
      region: 'Cuenca Valle de Bravo - Amanalco',
      updated: 'Actualizado hace 2 días',
      summary: 'Lineamientos de reforestación con especies nativas de pino y oyamel, metas de supervivencia y asignación de planta por ejido.',
    },
    {
      id: 'pb-02',
      title: 'Reglas de Operación: Pago por Servicios Ambientales',
      region: 'Cobertura Estatal · Estado de México',
      updated: 'Vigente 2026',
      summary: 'Requisitos para comunidades y pequeños propietarios forestales, montos de apoyo por hectárea conservada y calendario de ventanillas.',
    },
    {
      id: 'pb-03',
      title: 'Protocolo de Prevención y Manejo de Incendios Forestales',
      region: 'Región Oriente y Volcanes',
      updated: 'Documento normativo',
      summary: 'Coordinación de brigadas comunitarias, brechas cortafuego y rutas de atención prioritaria en temporada de estiaje.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-[#E0643A]/20">
      {/* ZONA 1: Isla de Navegación Flotante en Arcilla (Sin bordes rígidos ni píldoras de código) */}
      <header className="max-w-6xl mx-auto pt-6 px-4 sm:px-8">
        <nav
          aria-label="Navegación principal PROBOSQUE"
          className="flex flex-wrap items-center justify-between gap-4 rounded-full bg-[#D9D1B8] px-6 py-3.5 shadow-[10px_14px_28px_rgba(27,42,36,0.08),-6px_-6px_18px_rgba(255,255,255,0.85),inset_3px_3px_6px_rgba(255,255,255,0.75),inset_-3px_-4px_7px_rgba(107,139,120,0.22)]"
        >
          <div className="flex items-center gap-3.5">
            {/* Emblema Clay en Dosel Esmeralda */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#355044] text-[#F4F1EA] shadow-[4px_6px_12px_rgba(27,42,36,0.2),inset_2px_2px_4px_rgba(185,200,178,0.3),inset_-2px_-3px_5px_rgba(15,25,21,0.5)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L4 15h6v6h4v-6h6L12 3z" />
              </svg>
            </div>
            <div>
              <span className="font-['Outfit',sans-serif] text-xl font-medium tracking-tight text-[#1B2A24]">
                PROBOSQUE
              </span>
              <span className="hidden sm:inline-block mx-2.5 text-[#6B8B78]">·</span>
              <span className="hidden sm:inline-block text-sm font-medium text-[#355044]">
                Protectora de Bosques del Estado de México
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#acervo" className="text-sm font-medium text-[#355044] hover:text-[#1B2A24] transition-colors">
              Acervo Forestal
            </a>
            <a href="#programas" className="text-sm font-medium text-[#355044] hover:text-[#1B2A24] transition-colors">
              Programas 2026
            </a>
            <button
              type="button"
              className="rounded-full bg-gradient-to-br from-[#EB7147] to-[#D95B30] px-5 py-2.5 text-sm font-semibold text-white shadow-[6px_10px_20px_rgba(224,100,58,0.28),inset_2px_2px_5px_rgba(255,215,195,0.55),inset_-2px_-3px_6px_rgba(148,52,20,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Nueva consulta
            </button>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 pb-24 space-y-16">
        {/* ZONA 2: Cabecera Editorial Abierta + Indicadores Sin Tarjetas */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-sm font-semibold text-[#E0643A] tracking-normal">
              Asistente de Consulta Ciudadana y Técnica
            </p>
            <h1 className="font-['Outfit',sans-serif] text-4xl sm:text-5xl font-light tracking-tight text-[#1B2A24] leading-[1.12]">
              Información clara y viva para cuidar nuestros bosques
            </h1>
            <p className="text-base sm:text-lg text-[#6B8B78] max-w-2xl leading-relaxed">
              Consulta reglas de operación, programas de reforestación y dictámenes técnicos en lenguaje sencillo, sin menús complicados.
            </p>
          </div>

          {/* Indicadores al aire libre (CERO tarjetas, inspirado en diseño editorial sostenible) */}
          <div className="lg:col-span-5 flex flex-wrap sm:flex-nowrap justify-between gap-8 border-l-0 lg:border-l border-[#6B8B78]/20 lg:pl-8">
            {metrics.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div
                  className={`font-['Outfit',sans-serif] text-4xl font-light tracking-tight tabular-nums ${
                    item.accent ? 'text-[#E0643A]' : 'text-[#355044]'
                  }`}
                >
                  {item.value}
                </div>
                <p className="text-xs sm:text-sm text-[#6B8B78] leading-snug max-w-[140px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ZONA 3: Pozo Táctil Clay de Consulta (Recessed Clay Well) */}
        <section aria-label="Buscador y asistente forestal">
          <div className="rounded-[32px] bg-[#EAE4D3] p-5 sm:p-7 shadow-[inset_6px_6px_14px_rgba(107,139,120,0.22),inset_-6px_-6px_14px_rgba(255,255,255,0.88)]">
            <label htmlFor="probosque-query" className="sr-only">
              Escribe tu consulta sobre programas o expedientes de PROBOSQUE
            </label>
            <textarea
              id="probosque-query"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pregunta por requisitos de reforestación, apoyos por servicios ambientales o consulta un expediente..."
              className="w-full resize-none bg-transparent text-lg text-[#1B2A24] placeholder-[#6B8B78]/80 focus:outline-none leading-relaxed"
            />

            <div className="mt-4 pt-4 border-t border-[#6B8B78]/15 flex flex-wrap items-center justify-between gap-4">
              {/* Reemplazo amable de la etiqueta prohibida: Selector Clay interactivo en lugar de píldora azul de código */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedScope(
                      selectedScope.includes('Completo')
                        ? 'Solo Reglas de Operación 2026'
                        : 'Acervo Estatal Completo (10 expedientes)'
                    )
                  }
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#D9D1B8] px-4 py-2 text-sm font-medium text-[#1B2A24] shadow-[5px_7px_14px_rgba(27,42,36,0.08),-3px_-3px_9px_rgba(255,255,255,0.8),inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-2px_5px_rgba(107,139,120,0.2)] hover:bg-[#B9C8B2]/60 transition-all"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[#A3C962]" />
                  <span>{selectedScope}</span>
                  <svg className="w-4 h-4 text-[#355044]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Botón Principal Clay con el Color Extra #E0643A */}
              <button
                type="button"
                className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#EB7147] to-[#D95B30] px-7 py-3 text-base font-semibold text-white shadow-[8px_14px_26px_rgba(224,100,58,0.3),-3px_-3px_10px_rgba(255,255,255,0.6),inset_3px_3px_6px_rgba(255,215,195,0.55),inset_-3px_-4px_8px_rgba(148,52,20,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <span>Consultar ahora</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* ZONA 4: Flujo Editorial de Expedientes y Programas (Sin Cuadrícula de Tarjetas ni Barras Azules) */}
        <section id="acervo" className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="h-1.5 w-10 rounded-full bg-[#E0643A]" />
              <h2 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl font-normal text-[#1B2A24]">
                Documentos y programas activos en el acervo
              </h2>
            </div>
            <span className="text-sm font-medium text-[#6B8B78]">
              Mostrando los 3 programas principales de 10 documentos disponibles
            </span>
          </div>

          {/* Lista abierta separada por líneas orgánicas sutiles (No tarjetas) */}
          <div className="divide-y divide-[#6B8B78]/20 border-t border-b border-[#6B8B78]/20">
            {expedientes.map((item) => (
              <article
                key={item.id}
                className="group py-7 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#EAE4D3]/50 px-4 -mx-4 rounded-3xl transition-colors"
              >
                <div className="flex items-start gap-5 max-w-3xl">
                  {/* Símbolo Clay Táctil Suave */}
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B9C8B2] text-[#1B2A24] shadow-[6px_8px_16px_rgba(27,42,36,0.08),-3px_-3px_10px_rgba(255,255,255,0.7),inset_2px_2px_4px_rgba(255,255,255,0.65),inset_-2px_-3px_5px_rgba(53,80,68,0.18)]">
                    <svg className="w-5 h-5 text-[#355044]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#6B8B78]">
                      <span className="text-[#355044] font-semibold">{item.region}</span>
                      <span>·</span>
                      <span>{item.updated}</span>
                    </div>
                    <h3 className="font-['Outfit',sans-serif] text-xl font-medium text-[#1B2A24] group-hover:text-[#355044] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#6B8B78] leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 self-start md:self-center">
                  <button
                    type="button"
                    className="rounded-full bg-[#D9D1B8] px-5 py-2.5 text-sm font-semibold text-[#1B2A24] shadow-[5px_7px_14px_rgba(27,42,36,0.08),-3px_-3px_9px_rgba(255,255,255,0.8),inset_2px_2px_4px_rgba(255,255,255,0.7),inset_-2px_-2px_5px_rgba(107,139,120,0.2)] group-hover:bg-[#E0643A] group-hover:text-white group-hover:shadow-[6px_10px_20px_rgba(224,100,58,0.28),inset_2px_2px_5px_rgba(255,215,195,0.5),inset_-2px_-3px_6px_rgba(148,52,20,0.35)] transition-all"
                  >
                    Explorar expediente
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
