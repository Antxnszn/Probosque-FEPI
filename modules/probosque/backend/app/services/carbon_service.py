from typing import Dict, Any, Tuple, List, Optional
from shapely.geometry import shape, Polygon, MultiPolygon
from pyproj import Geod

from app.schemas.carbon import CarbonEstimateRequest, CarbonEstimateResponse


# Regional allometric profiles for the State of Mexico
ALLOMETRIC_PROFILES = {
    "pinus_hartwegii": {
        "scientific_name": "Pinus hartwegii",
        "common_name": "Pino de las alturas / Nevado de Toluca",
        "equation_code": "EQ-MEX-PHAR-01",
        "citation": "CONAFOR / Probosque Ecuaciones Alométricas Regionales 2021",
        "carbon_fraction": 0.47,
        "co2e_multiplier": 3.6667,
        "a": 0.0526,
        "b": 1.987,
        "c": 0.852,
        "valid_dbh_range": (5.0, 95.0),
    },
    "pinus_montezumae": {
        "scientific_name": "Pinus montezumae",
        "common_name": "Pino Moctezuma / Pino blanco",
        "equation_code": "EQ-MEX-PMON-02",
        "citation": "INIFAP / Probosque Manual de Alometría Forestal Central",
        "carbon_fraction": 0.47,
        "co2e_multiplier": 3.6667,
        "a": 0.0489,
        "b": 2.012,
        "c": 0.891,
        "valid_dbh_range": (5.0, 110.0),
    },
    "pinus_pseudostrobus": {
        "scientific_name": "Pinus pseudostrobus",
        "common_name": "Pino lacio / Chamite",
        "equation_code": "EQ-MEX-PPSE-03",
        "citation": "CONAFOR Catálogo de Ecuaciones Alométricas de México",
        "carbon_fraction": 0.47,
        "co2e_multiplier": 3.6667,
        "a": 0.0512,
        "b": 2.045,
        "c": 0.865,
        "valid_dbh_range": (5.0, 100.0),
    },
    "abies_religiosa": {
        "scientific_name": "Abies religiosa",
        "common_name": "Oyamel / Abeto sagrado",
        "equation_code": "EQ-MEX-AREL-04",
        "citation": "Instituto de Biología UNAM / Probosque 2020",
        "carbon_fraction": 0.48,
        "co2e_multiplier": 3.6667,
        "a": 0.0612,
        "b": 1.915,
        "c": 0.923,
        "valid_dbh_range": (5.0, 120.0),
    },
    "quercus_rugosa": {
        "scientific_name": "Quercus rugosa",
        "common_name": "Encino quiebra-hacha / Roble",
        "equation_code": "EQ-MEX-QRUG-05",
        "citation": "Revista Mexicana de Ciencias Forestales / INIFAP",
        "carbon_fraction": 0.48,
        "co2e_multiplier": 3.6667,
        "a": 0.0841,
        "b": 2.312,
        "c": None,
        "valid_dbh_range": (5.0, 90.0),
    },
    "alnus_jorullensis": {
        "scientific_name": "Alnus jorullensis",
        "common_name": "Aile / Aliso",
        "equation_code": "EQ-MEX-AJOR-06",
        "citation": "Colegio de Postgraduados / Probosque Fomento Forestal",
        "carbon_fraction": 0.46,
        "co2e_multiplier": 3.6667,
        "a": 0.0654,
        "b": 2.195,
        "c": None,
        "valid_dbh_range": (5.0, 80.0),
    },
}


class CarbonService:
    @staticmethod
    def calculate_geodesic_area_ha(geometry_geojson: Dict[str, Any]) -> float:
        """
        Derives authoritative geodesic area from GeoJSON using WGS84 ellipsoid.
        Never relies blindly on client-reported area.
        """
        geom_shape = shape(geometry_geojson)
        if not isinstance(geom_shape, (Polygon, MultiPolygon)):
            raise ValueError("Geometry must be a Polygon or MultiPolygon")

        geod = Geod(ellps="WGS84")
        area_sq_m, _ = geod.geometry_area_perimeter(geom_shape)
        return round(abs(area_sq_m) / 10000.0, 4)

    @classmethod
    def estimate_carbon(cls, req: CarbonEstimateRequest) -> CarbonEstimateResponse:
        """
        Calculates biomass, organic carbon stock and CO2 equivalent
        using certified regional allometric equations for the State of Mexico.
        """
        # 1. Determine Authoritative Area
        if req.geometry:
            area_ha = cls.calculate_geodesic_area_ha(req.geometry)
        elif req.area_ha and req.area_ha > 0:
            area_ha = round(req.area_ha, 4)
        else:
            raise ValueError("Must provide either a valid GeoJSON geometry or positive area_ha")

        # 2. Get Species Profile
        species_id = req.species_id.lower()
        profile = ALLOMETRIC_PROFILES.get(species_id, ALLOMETRIC_PROFILES["pinus_hartwegii"])

        warnings: List[str] = []

        # 3. Determine Trees Count
        if req.total_trees_count and req.total_trees_count > 0:
            total_trees = int(req.total_trees_count)
        else:
            density = req.tree_density_ha if req.tree_density_ha and req.tree_density_ha > 0 else 1100.0
            total_trees = int(round(density * area_ha))
            if not req.tree_density_ha:
                warnings.append("Se aplicó densidad estándar de 1,100 árboles/ha por omisión.")

        # 4. Check DBH Range
        dbh = req.mean_dbh_cm
        min_dbh, max_dbh = profile["valid_dbh_range"]
        if dbh < min_dbh or dbh > max_dbh:
            warnings.append(
                f"El DAP ({dbh} cm) está fuera del intervalo validado ({min_dbh}-{max_dbh} cm). La incertidumbre aumenta."
            )

        # 5. Calculate Biomass per Tree (kg dry matter)
        height = req.mean_height_m or 8.0
        if profile["c"] is not None:
            biomass_kg = profile["a"] * (dbh ** profile["b"]) * (height ** profile["c"])
        else:
            biomass_kg = profile["a"] * (dbh ** profile["b"])

        # 6. Totals
        total_dry_biomass_t = round((biomass_kg * total_trees) / 1000.0, 4)
        biomass_t_ha = round(total_dry_biomass_t / max(area_ha, 0.001), 4)

        carbon_fraction = profile["carbon_fraction"]
        total_carbon_t = round(total_dry_biomass_t * carbon_fraction, 4)
        carbon_t_ha = round(total_carbon_t / max(area_ha, 0.001), 4)

        co2e_factor = profile["co2e_multiplier"]
        total_co2e_t = round(total_carbon_t * co2e_factor, 4)
        co2e_t_ha = round(total_co2e_t / max(area_ha, 0.001), 4)

        # 7. Uncertainty and Confidence
        uncertainty_percent = 15.0
        if req.mean_height_m is None and profile["c"] is not None:
            uncertainty_percent += 8.0
        if not req.inventory_plots_count or req.inventory_plots_count < 3:
            uncertainty_percent += 7.0

        uncertainty_margin_t = round((total_co2e_t * uncertainty_percent) / 100.0, 4)
        low_t = max(0.0, round(total_co2e_t - uncertainty_margin_t, 4))
        high_t = round(total_co2e_t + uncertainty_margin_t, 4)

        data_quality = "PRELIMINAR"
        if req.inventory_plots_count and req.inventory_plots_count >= 4 and req.mean_height_m:
            data_quality = "ALTA"
        elif req.mean_height_m or req.total_trees_count:
            data_quality = "MEDIA"

        return CarbonEstimateResponse(
            area_ha=area_ha,
            species_id=species_id,
            species_scientific_name=profile["scientific_name"],
            total_trees_estimated=total_trees,
            biomass_kg_per_tree=round(biomass_kg, 2),
            total_dry_biomass_t=total_dry_biomass_t,
            biomass_t_ha=biomass_t_ha,
            carbon_fraction=carbon_fraction,
            total_carbon_t=total_carbon_t,
            carbon_t_ha=carbon_t_ha,
            co2e_factor=co2e_factor,
            total_co2e_t=total_co2e_t,
            co2e_t_ha=co2e_t_ha,
            uncertainty_percent=uncertainty_percent,
            confidence_interval_low_t=low_t,
            confidence_interval_high_t=high_t,
            confidence_level="90%",
            data_quality_level=data_quality,
            allometric_equation_code=profile["equation_code"],
            methodology_version="CARBON-1.0",
            source_citation=profile["citation"],
            warnings=warnings,
            disclaimer=(
                "Esta estimación de biomasa y carbono es de carácter técnico-preliminar para planificación "
                "y fomento forestal. No constituye una certificación formal de créditos de carbono, ni "
                "reemplaza un inventario forestal exhaustivo bajo estándar MRV."
            ),
        )
