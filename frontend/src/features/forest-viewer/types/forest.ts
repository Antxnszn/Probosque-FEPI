export interface LegendClass {
  code: number;
  name_es: string;
  name_en: string;
  hex_color: string;
  is_forest: boolean;
  is_native_forest: boolean;
  is_forest_approved: boolean;
  description?: string;
}

export interface DataSourceInfo {
  key: string;
  provider: string;
  product: string;
  collection_version: string;
  asset_id: string;
  first_year: number;
  last_year: number;
  mvp_first_year: number;
  mvp_last_year: number;
  resolution_m: number;
  license: string;
  citation: string;
  methodology_url?: string;
}

export interface ForestMetadata {
  application: string;
  state_code: string;
  state_name: string;
  municipalities_count: number;
  years_available: number[];
  sources: Record<string, DataSourceInfo>;
  legend_classes: LegendClass[];
  forest_grouping_version: string;
  methodology_version: string;
}

export interface RegionSummary {
  inegi_code: string;
  cve_mun: string;
  name: string;
  area_ha: number;
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  center: [number, number]; // [lat, lon]
}

export interface RegionDetail extends RegionSummary {
  type: 'municipality' | 'state';
  parent_code: string;
  geometry?: GeoJSON.Geometry;
}

export interface AnnualClassStat {
  code: number;
  name_es: string;
  hex_color: string;
  area_ha?: number | null;
  is_forest_approved: boolean;
}

export interface AnnualStatsSeries {
  year: number;
  total_forest_approved_ha?: number | null;
  classes: AnnualClassStat[];
}

export interface AnnualStatsResponse {
  region_id: string;
  region_name: string;
  indicator: string;
  unit: string;
  source: Record<string, any>;
  series: AnnualStatsSeries[];
  data_status: 'ready' | 'pending_ingest' | 'unavailable';
}

export interface LossStatsYear {
  year: number;
  gross_tree_cover_loss_ha?: number | null;
}

export interface LossStatsResponse {
  region_id: string;
  region_name: string;
  indicator: string;
  unit: string;
  source: Record<string, any>;
  canopy_threshold_pct: number;
  scientific_disclaimer: string;
  series: LossStatsYear[];
  data_status: 'ready' | 'pending_ingest' | 'unavailable';
}

export interface TransitionCell {
  class_from: number;
  class_to: number;
  name_from: string;
  name_to: string;
  area_ha?: number | null;
}

export interface TransitionStatsResponse {
  region_id: string;
  region_name: string;
  year_from: number;
  year_to: number;
  source: Record<string, any>;
  transitions: TransitionCell[];
  data_status: 'ready' | 'pending_ingest' | 'unavailable';
}

export interface LayerSpec {
  id: string;
  indicator: 'land_cover' | 'tree_cover_loss' | 'transition';
  name: string;
  year: number;
  pair_year?: number;
  tile_strategy: string;
  tile_url_template?: string | null;
  status: 'ready' | 'pending_ingest' | 'unavailable';
  legend: Array<{ code?: number; label: string; color: string }>;
}

export type BasemapMode = 'carto_dark' | 'carto_positron' | 'satellite';
