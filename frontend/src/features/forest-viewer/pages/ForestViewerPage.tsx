import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ViewerHeader } from '../components/ViewerHeader';
import { ViewerSidebar } from '../components/ViewerSidebar';
import { ForestMap } from '../components/ForestMap';
import { ForestStatsPanel } from '../components/ForestStatsPanel';
import { SourceMetadataModal } from '../components/SourceMetadataModal';
import {
  fetchForestMetadata,
  fetchMunicipalities,
  fetchMunicipalitiesGeoJSON,
  fetchStateGeoJSON,
  fetchAnnualStats,
  fetchLossStats,
  fetchLayers,
} from '../services/forestApi';
import type {
  ForestMetadata,
  RegionSummary,
  AnnualStatsResponse,
  LossStatsResponse,
  LayerSpec,
} from '../types/forest';

export const ForestViewerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Primary State
  const [metadata, setMetadata] = useState<ForestMetadata | null>(null);
  const [municipalities, setMunicipalities] = useState<RegionSummary[]>([]);
  const [municipalitiesGeoJSON, setMunicipalitiesGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);
  const [stateGeoJSON, setStateGeoJSON] = useState<GeoJSON.FeatureCollection | null>(null);

  // Selection state (from URL search params or defaults)
  const initialRegion = searchParams.get('region') || '15110'; // Default to Valle de Bravo for Phase 2 demo
  const initialYear = Number(searchParams.get('year')) || 2025;
  const initialIndicator = (searchParams.get('indicator') as 'land_cover' | 'tree_cover_loss') || 'land_cover';

  const [selectedCode, setSelectedCode] = useState<string>(initialRegion);
  const [activeIndicator, setActiveIndicator] = useState<'land_cover' | 'tree_cover_loss'>(initialIndicator);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  // Compare mode
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareYearA, setCompareYearA] = useState<number>(2010);
  const [compareYearB, setCompareYearB] = useState<number>(2025);

  // Modals & responsive state
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState<boolean>(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState<boolean>(false);

  // Stats & Raster Layers
  const [annualStats, setAnnualStats] = useState<AnnualStatsResponse | null>(null);
  const [lossStats, setLossStats] = useState<LossStatsResponse | null>(null);
  const [activeRasterLayer, setActiveRasterLayer] = useState<LayerSpec | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Load initial metadata and geometries
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        setIsLoadingData(true);
        const [metaData, munList, munGeo, stateGeo] = await Promise.all([
          fetchForestMetadata(),
          fetchMunicipalities(),
          fetchMunicipalitiesGeoJSON(),
          fetchStateGeoJSON(),
        ]);

        if (isMounted) {
          setMetadata(metaData);
          setMunicipalities(munList);
          setMunicipalitiesGeoJSON(munGeo);
          setStateGeoJSON(stateGeo);
        }
      } catch (err) {
        console.error('Failed to load initial forest viewer data', err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update URL search parameters when selection changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCode) params.set('region', selectedCode);
    params.set('year', selectedYear.toString());
    params.set('indicator', activeIndicator);
    if (isCompareMode) {
      params.set('compare', '1');
      params.set('yearA', compareYearA.toString());
      params.set('yearB', compareYearB.toString());
    }
    setSearchParams(params, { replace: true });
  }, [selectedCode, selectedYear, activeIndicator, isCompareMode, compareYearA, compareYearB, setSearchParams]);

  // Load stats when region changes
  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      if (!selectedCode) return;
      try {
        const [annual, loss] = await Promise.all([
          fetchAnnualStats(selectedCode, 2010, 2025),
          fetchLossStats(selectedCode, 2010, 2025),
        ]);
        if (isMounted) {
          setAnnualStats(annual);
          setLossStats(loss);
        }
      } catch (err) {
        console.warn('Error loading stats', err);
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [selectedCode]);

  // Load active raster layer when year or indicator changes
  useEffect(() => {
    let isMounted = true;
    async function loadLayer() {
      try {
        const layers = await fetchLayers(selectedYear);
        if (!isMounted) return;
        const matched = layers.find((l) => l.indicator === activeIndicator) || layers[0] || null;
        setActiveRasterLayer(matched);
      } catch (err) {
        console.warn('Error loading layers', err);
      }
    }
    loadLayer();
    return () => {
      isMounted = false;
    };
  }, [selectedYear, activeIndicator]);

  const selectedMunicipality = useMemo(() => {
    if (selectedCode === '15') {
      return {
        inegi_code: '15',
        cve_mun: '000',
        name: 'Estado de México',
        area_ha: 2235175.16,
        bbox: [-100.6131, 18.3669, -98.5969, 20.2859] as [number, number, number, number],
        center: [19.35, -99.65] as [number, number],
      };
    }
    return municipalities.find((m) => m.inegi_code === selectedCode) || null;
  }, [municipalities, selectedCode]);

  const handleSelectMunicipality = useCallback((code: string) => {
    setSelectedCode(code);
    setIsSidebarMobileOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F4F1EA] text-[#1B2A24] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Top Navbar */}
      <ViewerHeader
        onToggleSidebarMobile={() => setIsSidebarMobileOpen((prev) => !prev)}
        onOpenMetadataModal={() => setIsMetadataModalOpen(true)}
        selectedMuniName={selectedMunicipality?.name || 'Estado de México'}
      />
      {isLoadingData && (
        <div className="h-1 w-full bg-[#D9D1B8] overflow-hidden">
          <div className="w-1/2 h-full bg-[#E0643A] animate-pulse" />
        </div>
      )}

      {/* 2. Main Body (Sidebar + Map Viewport + Bottom Stats) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {isSidebarMobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs lg:hidden"
            onClick={() => setIsSidebarMobileOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <ViewerSidebar
          municipalities={municipalities}
          selectedCode={selectedCode}
          onSelectMunicipality={handleSelectMunicipality}
          activeIndicator={activeIndicator}
          onChangeIndicator={setActiveIndicator}
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
          isCompareMode={isCompareMode}
          onToggleCompare={setIsCompareMode}
          compareYearA={compareYearA}
          onChangeCompareYearA={setCompareYearA}
          compareYearB={compareYearB}
          onChangeCompareYearB={setCompareYearB}
          metadata={metadata}
          onOpenMetadataModal={() => setIsMetadataModalOpen(true)}
          isOpenMobile={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
        />

        {/* Center / Right Viewport: Map & Stats Drawer */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Map Area */}
          <div className="flex-1 relative">
            <ForestMap
              municipalitiesGeoJSON={municipalitiesGeoJSON}
              stateGeoJSON={stateGeoJSON}
              selectedMunicipalityCode={selectedCode}
              selectedMunicipality={selectedMunicipality}
              onSelectMunicipality={handleSelectMunicipality}
              activeIndicator={activeIndicator}
              selectedYear={selectedYear}
              activeRasterLayer={activeRasterLayer}
              isCompareMode={isCompareMode}
              compareYearA={compareYearA}
              compareYearB={compareYearB}
            />
          </div>

          {/* Bottom Forest Stats Panel */}
          <ForestStatsPanel
            selectedMunicipality={selectedMunicipality}
            selectedYear={selectedYear}
            activeIndicator={activeIndicator}
            annualStats={annualStats}
            lossStats={lossStats}
            legendClasses={metadata?.legend_classes || []}
            onOpenMetadataModal={() => setIsMetadataModalOpen(true)}
            onChangeYear={setSelectedYear}
            onSelectMunicipality={handleSelectMunicipality}
          />
        </main>
      </div>

      {/* 3. Metadata & Scientific Sources Modal */}
      <SourceMetadataModal
        isOpen={isMetadataModalOpen}
        onClose={() => setIsMetadataModalOpen(false)}
        metadata={metadata}
      />
    </div>
  );
};
export default ForestViewerPage;
