"""
Automated unit & integration tests for the Python Scientific Data Pipeline.
Tests real NASA POWER, ISRIC SoilGrids, and MODIS NDVI snapshots in src/data/snapshots/.
"""

import unittest
from pathlib import Path
from .models import ProvenanceMeta, SoilLayerRecord, VerificationStatus
from .validators import (
    clean_power_sentinel,
    validate_power_daily_record,
    validate_soil_layer,
    validate_ndvi_observation,
    validate_geojson_geometry,
)
from .harmonizer import (
    compute_fao56_et0_daily,
    prioritize_soil_layers,
    harmonize_snapshot_file,
    build_model_readiness_summary,
)


SNAPSHOT_DIR = Path(__file__).resolve().parent.parent / "src" / "data" / "snapshots"


class TestScientificDataPipeline(unittest.TestCase):
    def test_power_sentinel_and_physical_bounds(self) -> None:
        self.assertIsNone(clean_power_sentinel(-999))
        self.assertIsNone(clean_power_sentinel(-99.0))
        self.assertEqual(clean_power_sentinel(24.5), 24.5)

        ok, cleaned, issues = validate_power_daily_record(
            {
                "tmax": 28.4,
                "tmin": 12.1,
                "tmean": 20.2,
                "precip": 4.5,
                "rh": 54.0,
                "wind2m": 2.8,
                "rs": 22.1,
                "gwetRoot": 0.48,
                "gwetTop": 0.41,
            }
        )
        self.assertTrue(ok)
        self.assertEqual(len(issues), 0)
        self.assertEqual(cleaned["tmax"], 28.4)

        # Inverted temperature should flag an issue
        ok_bad, _, issues_bad = validate_power_daily_record({"tmax": 10.0, "tmin": 18.0, "tmean": 14.0})
        self.assertFalse(ok_bad)
        self.assertTrue(any("tmin" in msg for msg in issues_bad))

    def test_soil_layer_validation_and_lab_priority(self) -> None:
        ok, issues = validate_soil_layer(
            {
                "top": 0,
                "bottom": 5,
                "sand": 30.0,
                "silt": 38.0,
                "clay": 32.0,
                "ph": 7.8,
                "bulkDensity": 1.35,
                "thetaFC": 0.34,
                "thetaWP": 0.18,
            }
        )
        self.assertTrue(ok, f"Unexpected soil issues: {issues}")

        prov_sg = ProvenanceMeta(
            source_id="isric_soilgrids_v2",
            dataset_version="v2.0",
            observation_timestamp="2021-01-01",
            retrieval_timestamp="2026-11-14T00:00:00Z",
            latitude=37.57,
            longitude=32.77,
            spatial_resolution_m=250.0,
            units={"ph": "pH"},
            quality_flag="predicted",
            verification_status=VerificationStatus.ESTIMATED,
            source_url="https://soilgrids.org/",
        )
        prov_lab = ProvenanceMeta(
            source_id="user_lab",
            dataset_version="2026-lab",
            observation_timestamp="2026-10-01",
            retrieval_timestamp="2026-11-14T00:00:00Z",
            latitude=37.57,
            longitude=32.77,
            spatial_resolution_m=1.0,
            units={"ph": "pH"},
            quality_flag="measured_lab",
            verification_status=VerificationStatus.VERIFIED,
            source_url="user://laboratory-report",
        )
        sg_layer = SoilLayerRecord(
            field_id="konya-cumra",
            data_origin="soilgrids_v2",
            priority_rank=2,
            depth_top_cm=0,
            depth_bottom_cm=30,
            sand_pct=29.0,
            silt_pct=37.0,
            clay_pct=34.0,
            soc_g_kg=11.2,
            ph_h2o=7.9,
            cec_cmol_kg=24.0,
            nitrogen_g_kg=1.1,
            bdod_g_cm3=1.36,
            cfvo_vol_pct=8.0,
            theta_fc_m3m3=0.35,
            theta_wp_m3m3=0.19,
            provenance=prov_sg,
        )
        lab_layer = SoilLayerRecord(
            field_id="konya-cumra",
            data_origin="user_lab",
            priority_rank=1,
            depth_top_cm=0,
            depth_bottom_cm=30,
            sand_pct=26.0,
            silt_pct=38.0,
            clay_pct=36.0,
            soc_g_kg=14.5,
            ph_h2o=7.65,
            cec_cmol_kg=26.0,
            nitrogen_g_kg=1.4,
            bdod_g_cm3=1.31,
            cfvo_vol_pct=5.0,
            theta_fc_m3m3=0.37,
            theta_wp_m3m3=0.19,
            provenance=prov_lab,
        )

        merged, source_used = prioritize_soil_layers([sg_layer], [lab_layer])
        self.assertEqual(source_used, "user_lab_override")
        self.assertEqual(merged[0].data_origin, "user_lab")
        self.assertEqual(merged[0].ph_h2o, 7.65)

    def test_ndvi_quality_filtering(self) -> None:
        val_good, flag_good = validate_ndvi_observation(6420, 0)
        self.assertEqual(val_good, 0.642)
        self.assertEqual(flag_good, "good")

        val_cloudy, flag_cloudy = validate_ndvi_observation(6420, 3)
        self.assertIsNone(val_cloudy)
        self.assertEqual(flag_cloudy, "rejected_quality_rank_3")

    def test_geojson_polygon_and_multipolygon(self) -> None:
        poly = {
            "type": "Polygon",
            "coordinates": [
                [
                    [32.760, 37.560],
                    [32.780, 37.560],
                    [32.780, 37.575],
                    [32.760, 37.575],
                    [32.760, 37.560],
                ]
            ],
        }
        rec = validate_geojson_geometry("test-poly", "Konya Test Field", poly)
        self.assertTrue(rec.is_valid)
        self.assertGreater(rec.area_da, 2000.0)

        multipoly = {
            "type": "MultiPolygon",
            "coordinates": [
                poly["coordinates"],
                [
                    [
                        [32.790, 37.560],
                        [32.800, 37.560],
                        [32.800, 37.570],
                        [32.790, 37.570],
                        [32.790, 37.560],
                    ]
                ],
            ],
        }
        mrec = validate_geojson_geometry("test-mpoly", "Konya MultiParcel", multipoly)
        self.assertTrue(mrec.is_valid)
        self.assertGreater(mrec.area_da, rec.area_da)

    def test_fao56_et0_and_real_pilot_snapshots(self) -> None:
        et0 = compute_fao56_et0_daily(
            tmean_c=24.0,
            tmax_c=31.5,
            tmin_c=16.5,
            rh_pct=42.0,
            wind2m_ms=2.6,
            rs_mj_m2_day=25.4,
            elevation_m=1015.0,
            lat_deg=37.57,
            day_of_year=185,
        )
        self.assertGreater(et0, 4.5)
        self.assertLess(et0, 8.5)

        for snap_id in ("konya-cumra", "sanliurfa-harran", "adana-yuregir", "edirne-uzunkopru", "polatli-ankara"):
            snap_file = SNAPSHOT_DIR / f"{snap_id}.json"
            self.assertTrue(snap_file.exists(), f"Missing real snapshot at {snap_file}")
            h = harmonize_snapshot_file(snap_file)
            self.assertEqual(h["field_id"], snap_id)
            self.assertGreater(h["total_climate_days"], 9000)
            self.assertEqual(h["soil_layers_count"], 6)
            # Note: sanliurfa-harran 100-200 cm has raw SoilGrids wv0033 (0.305) < wv1500 (0.306),
            # which is rightly caught by physical validation and routed to Saxton-Rawls pedotransfer.
            self.assertGreaterEqual(h["valid_soil_layers"], 5)
            self.assertGreater(h["valid_ndvi_composites"], 180)

            readiness = build_model_readiness_summary(h)
            self.assertTrue(readiness["ready_for_simulation"])
            self.assertEqual(readiness["readiness_score"], 100.0)


if __name__ == "__main__":
    unittest.main()
