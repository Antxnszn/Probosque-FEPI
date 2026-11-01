import type {
  ForestMetadata,
  RegionSummary,
  RegionDetail,
  AnnualStatsResponse,
  LossStatsResponse,
  TransitionStatsResponse,
  LayerSpec,
} from '../types/forest';

const API_BASE = '/api/v1/forest';

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
  } catch (err) {
    console.warn(`Fetch error for ${url}:`, err);
  }
  return null;
}

export async function fetchForestMetadata(): Promise<ForestMetadata> {
  const data = await safeFetchJson<ForestMetadata>(`${API_BASE}/metadata`);
  if (data) return data;

  // Fallback defaults for standalone client testing
  return {
    application: 'Probosque Visor Forestal Multitemporal',
    state_code: '15',
    state_name: 'Estado de México',
    municipalities_count: 125,
    years_available: Array.from({ length: 16 }, (_, i) => 2010 + i),
    sources: {
      mapbiomas_mexico: {
        key: 'mapbiomas_mexico',
        provider: 'Iniciativa MapBiomas México',
        product: 'Colección 1.0 — Cobertura y Uso del Suelo',
        collection_version: '1.0',
        asset_id: 'projects/mapbiomas-public/assets/mexico/lulc/collection1/mapbiomas_mexico_collection1_coverage_v1',
        first_year: 1985,
        last_year: 2025,
        mvp_first_year: 2010,
        mvp_last_year: 2025,
        resolution_m: 30,
        license: 'CC BY-SA 4.0',
        citation: 'MapBiomas México Colección 1.0 (1985-2025)',
      },
      hansen_gfc: {
        key: 'hansen_gfc',
        provider: 'Hansen / UMD / Google',
        product: 'Global Forest Change v1.13',
        collection_version: 'v1.13',
        asset_id: 'UMD/hansen/global_forest_change_2025_v1_13',
        first_year: 2000,
        last_year: 2025,
        mvp_first_year: 2010,
        mvp_last_year: 2025,
        resolution_m: 30,
        license: 'CC BY 4.0',
        citation: 'Hansen et al. (2013) Science 342:850–53',
      },
    },
    legend_classes: [
      { code: 88, name_es: 'Bosque templado', name_en: 'Temperate forest', hex_color: '#329c5a', is_forest: true, is_native_forest: true, is_forest_approved: true },
      { code: 89, name_es: 'Selva seca / Bosque tropical seco', name_en: 'Tropical dry forest', hex_color: '#6bd46c', is_forest: true, is_native_forest: true, is_forest_approved: true },
      { code: 3, name_es: 'Bosque húmedo tropical', name_en: 'Tropical humid forest', hex_color: '#1f8d49', is_forest: true, is_native_forest: true, is_forest_approved: true },
      { code: 9, name_es: 'Plantación forestal', name_en: 'Forest plantation', hex_color: '#7a5900', is_forest: true, is_native_forest: false, is_forest_approved: true },
      { code: 66, name_es: 'Matorrales', name_en: 'Shrublands', hex_color: '#a89358', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 45, name_es: 'Sabana y pastizal natural', name_en: 'Savanna and natural grassland', hex_color: '#807a40', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 15, name_es: 'Pastizal cultivado', name_en: 'Cultivated grassland', hex_color: '#edde8e', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 19, name_es: 'Agricultura anual', name_en: 'Annual crop', hex_color: '#c27ba0', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 36, name_es: 'Cultivo perenne', name_en: 'Perennial crop', hex_color: '#d082de', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 24, name_es: 'Área urbana y construida', name_en: 'Urban and built-up area', hex_color: '#d4271e', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 25, name_es: 'Otras áreas no vegetadas', name_en: 'Other non-vegetated areas', hex_color: '#db4d4f', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 33, name_es: 'Cuerpos de agua', name_en: 'River, lake or ocean', hex_color: '#2532e4', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 34, name_es: 'Nieve y hielo permanente', name_en: 'Ice and permanent snow', hex_color: '#93dfe6', is_forest: false, is_native_forest: false, is_forest_approved: false },
      { code: 11, name_es: 'Inundado / Humedal', name_en: 'Flooded', hex_color: '#519799', is_forest: false, is_native_forest: false, is_forest_approved: false },
    ],
    forest_grouping_version: 'probosque-v1.0',
    methodology_version: 'PROBOSQUE-VF-1.0',
  };
}

export async function fetchMunicipalities(): Promise<RegionSummary[]> {
  const data = await safeFetchJson<RegionSummary[]>(`${API_BASE}/regions?type=municipality`);
  if (data && data.length > 0) return data;

  // Fallback to static public json
  const staticRes = await fetch('/data/edomex_municipios_catalog.json');
  return await staticRes.json();
}

export async function fetchRegionDetail(regionId: string): Promise<RegionDetail | null> {
  return await safeFetchJson<RegionDetail>(`${API_BASE}/regions/${regionId}`);
}

export async function fetchStateGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const data = await safeFetchJson<GeoJSON.FeatureCollection>(`${API_BASE}/geojson/state?simplified=true`);
  if (data && data.features && data.features.length > 0) return data;

  const staticRes = await fetch('/data/edomex_state_simplified.geojson');
  return await staticRes.json();
}

export async function fetchMunicipalitiesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const data = await safeFetchJson<GeoJSON.FeatureCollection>(`${API_BASE}/geojson/municipalities?simplified=true`);
  if (data && data.features && data.features.length > 0) return data;

  const staticRes = await fetch('/data/edomex_125_municipios_simplified.geojson');
  return await staticRes.json();
}

export async function fetchAnnualStats(
  regionId: string,
  fromYear: number = 2010,
  toYear: number = 2025
): Promise<AnnualStatsResponse> {
  try {
    const res = await fetch(`${API_BASE}/stats/annual?region_id=${regionId}&from=${fromYear}&to=${toYear}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('API /stats/annual error', err);
  }

  return {
    region_id: regionId,
    region_name: regionId === '15' ? 'Estado de México' : regionId,
    indicator: 'land_cover_area_by_class',
    unit: 'ha',
    source: { key: 'mapbiomas_mexico', collection: '1.0' },
    series: [],
    data_status: 'pending_ingest',
  };
}

export async function fetchLossStats(
  regionId: string,
  fromYear: number = 2010,
  toYear: number = 2025
): Promise<LossStatsResponse> {
  try {
    const res = await fetch(`${API_BASE}/stats/loss?region_id=${regionId}&from=${fromYear}&to=${toYear}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('API /stats/loss error', err);
  }

  return {
    region_id: regionId,
    region_name: regionId === '15' ? 'Estado de México' : regionId,
    indicator: 'gross_tree_cover_loss',
    unit: 'ha',
    source: { key: 'hansen_gfc', collection: 'v1.13' },
    canopy_threshold_pct: 30,
    scientific_disclaimer:
      'La pérdida bruta de cobertura arbórea (Hansen) mide perturbaciones del dosel arbóreo y NO equivale automáticamente a deforestación permanente ni cambio de uso de suelo.',
    series: [],
    data_status: 'pending_ingest',
  };
}

export async function fetchTransitionStats(
  regionId: string,
  fromYear: number = 2010,
  toYear: number = 2025
): Promise<TransitionStatsResponse> {
  try {
    const res = await fetch(`${API_BASE}/stats/transitions?region_id=${regionId}&from=${fromYear}&to=${toYear}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('API /stats/transitions error', err);
  }

  return {
    region_id: regionId,
    region_name: regionId === '15' ? 'Estado de México' : regionId,
    year_from: fromYear,
    year_to: toYear,
    source: { key: 'mapbiomas_mexico', collection: '1.0' },
    transitions: [],
    data_status: 'pending_ingest',
  };
}

export async function fetchLayers(year: number = 2025): Promise<LayerSpec[]> {
  try {
    const res = await fetch(`${API_BASE}/layers?year=${year}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('API /layers error', err);
  }
  return [];
}
