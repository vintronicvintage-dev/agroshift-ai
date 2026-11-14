import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import type { MasterCropCode, MasterProvinceRecord } from "@/lib/data/turkiyeAgroMaster";

const execFileAsync = promisify(execFile);

export interface ParcelAnalyzeRequest {
  lat: number;
  lon: number;
  alan_dekar: number;
  secilen_urunler?: [string, string, string];
  mevcut_plan?: [string, string, string];
  ekim_bicimi: "geleneksel_surum" | "aniza_dogrudan_ekim";
  sulama_bicimi: "kuru_tarim" | "salma" | "yagmurlama" | "center_pivot" | "damla";
  yillik_su_kotasi_mm?: number | null;
  iklim_modu?: "tipik" | "kurak" | "projeksiyon_2035_ssp245" | "projeksiyon_2035_ssp585" | "ssp245" | "ssp585";
  skip_live_api?: boolean;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function runTypeScriptMasterFallback(body: ParcelAnalyzeRequest, cropsList: string[]) {
  const masterPath = path.join(process.cwd(), "data", "turkiye_agro_master.json");
  const raw = await fs.readFile(masterPath, "utf-8");
  const master = JSON.parse(raw);

  const iller = master.iller_detayli_81 as Record<string, MasterProvinceRecord>;
  let bestPlaka = "42";
  let bestDist = Infinity;

  for (const [plaka, pdata] of Object.entries(iller)) {
    const c = pdata.kimlik_ve_cografya.merkez_koordinat;
    const d = haversineKm(body.lat, body.lon, c.lat, c.lon);
    if (d < bestDist) {
      bestDist = d;
      bestPlaka = plaka;
    }
  }

  const prov = iller[bestPlaka];
  const kc = prov.kimlik_ve_cografya;
  const basinCode = kc.havza_kodu;
  const basinData = master.tarim_havzalari[basinCode];
  const soil = prov.toprak_profili_0_30cm_soilgrids;
  const clim = prov.iklim_ve_su_serisi_2005_2026;
  const sat = prov.uydu_gozlem_smap_hls_ecostress;
  const cmip6 = prov.projeksiyon_2035_cmip6;
  const matris = prov.il_urun_verim_su_ve_rotasyon_matrisi;

  const tillage = master.ekim_bicimleri[body.ekim_bicimi] ?? master.ekim_bicimleri.geleneksel_surum;
  const irrigation = master.sulama_bicimleri[body.sulama_bicimi] ?? master.sulama_bicimleri.yagmurlama;

  const evaluateQuick = (crops3: string[], mode: string) => {
    let totalEtc = 0;
    let totalPe = 0;
    let totalDn = 0;
    let totalDt = 0;
    let totalN = 0;
    const yearly = crops3.map((rawCode, idx) => {
      const code = (rawCode in matris.urun_detay_tablosu ? rawCode : "Bugday") as MasterCropCode;
      const cinfo = matris.urun_detay_tablosu[code];
      const etcFactor = mode === "kurak" ? 1.09 : mode.includes("585") ? 1.09 : mode.includes("245") ? 1.05 : 1.0;
      const peFactor = mode === "kurak" ? 0.68 : mode.includes("585") ? 0.88 : mode.includes("245") ? 0.94 : 1.0;

      const etc = Number((cinfo.ETc_mm * etcFactor * (0.82 + 0.18 * tillage.buharlasma_katsayisi)).toFixed(1));
      const pe = Number((cinfo.Pe_etkin_mm * peFactor * tillage.infiltrasyon_katsayisi).toFixed(1));
      const smapCredit = Number((22 + tillage.toprak_nemi_koruma_mm).toFixed(1));
      const dn = Math.max(0, Number((etc - pe - smapCredit).toFixed(1)));
      const eff = irrigation.toplam_randiman;
      const dt = irrigation.sulama_uygulanir_mi && eff > 0 ? Number((dn / eff).toFixed(1)) : 0;

      totalEtc += etc;
      totalPe += pe;
      totalDn += dn;
      totalDt += dt;
      totalN += cinfo.biyolojik_azot_etkisi_kg_da;

      return {
        yil: idx + 1,
        urun_kodu: code,
        urun_adi: cinfo.urun_adi,
        ekolojik_uygunluk: cinfo.ekolojik_uygunluk_durumu,
        ekim_donemi: cinfo.ekim_donemi,
        hasat_donemi: cinfo.hasat_donemi,
        su_tuketimi_ve_sulama: {
          ETc_mm: etc,
          Pe_etkin_yagis_mm: pe,
          dn_net_sulama_mm: dn,
          dt_brut_sulama_mm: dt,
          dt_brut_su_hacmi_m3: Number((dt * body.alan_dekar).toFixed(1)),
        },
        verim_ve_azot: {
          beklenen_verim_kg_da: irrigation.sulama_uygulanir_mi ? cinfo.sulu_verim_kg_da : cinfo.kuru_verim_kg_da,
          biyolojik_azot_etkisi_kg_da: cinfo.biyolojik_azot_etkisi_kg_da,
        },
      };
    });

    return {
      rotasyon_dizisi: crops3,
      ekim_bicimi: tillage.ad,
      sulama_bicimi: irrigation.ad,
      yillik_detaylar: yearly,
      toplam_3_yil_ozeti: {
        toplam_ETc_mm: Number(totalEtc.toFixed(1)),
        toplam_Pe_etkin_mm: Number(totalPe.toFixed(1)),
        toplam_dn_net_sulama_mm: Number(totalDn.toFixed(1)),
        toplam_dt_brut_sulama_mm: Number(totalDt.toFixed(1)),
        toplam_dt_brut_su_hacmi_m3: Number((totalDt * body.alan_dekar).toFixed(1)),
        net_azot_dengesi_kg_da: Number(totalN.toFixed(1)),
      },
    };
  };

  const activeMode = body.iklim_modu ?? "tipik";
  const farmerEval = evaluateQuick(cropsList, activeMode);
  const paketler = matris.onerilen_3_yillik_rotasyon_paketleri;
  const scenarios = [
    {
      senaryo_kodu: "Aday_1_Dengeli_Uyum",
      senaryo_adi: `Aday 1 (${kc.il_adi}) — Dengeli İklim ve Gelir Uyumu`,
      rotasyon_3_yil: paketler.Dengeli_Gelir.rotasyon_3_yil,
      onerilen_ekim_bicimi_kodu: paketler.Dengeli_Gelir.onerilen_ekim_bicimi,
      onerilen_sulama_bicimi_kodu: paketler.Dengeli_Gelir.onerilen_sulama_bicimi,
      neden_onerildi: paketler.Dengeli_Gelir.aciklama,
      ...evaluateQuick(paketler.Dengeli_Gelir.rotasyon_3_yil, activeMode),
    },
    {
      senaryo_kodu: "Aday_2_Maksimum_Su_Tasarrufu",
      senaryo_adi: `Aday 2 (${kc.il_adi}) — Maksimum Su Tasarrufu ve Kuraklık Kalkanı`,
      rotasyon_3_yil: paketler.Maksimum_Su_Tasarrufu.rotasyon_3_yil,
      onerilen_ekim_bicimi_kodu: paketler.Maksimum_Su_Tasarrufu.onerilen_ekim_bicimi,
      onerilen_sulama_bicimi_kodu: paketler.Maksimum_Su_Tasarrufu.onerilen_sulama_bicimi,
      neden_onerildi: paketler.Maksimum_Su_Tasarrufu.aciklama,
      ...evaluateQuick(paketler.Maksimum_Su_Tasarrufu.rotasyon_3_yil, activeMode),
    },
    {
      senaryo_kodu: "Aday_3_Toprak_Onarimi",
      senaryo_adi: `Aday 3 (${kc.il_adi}) — Maksimum Toprak ve Biyolojik Azot Onarımı`,
      rotasyon_3_yil: paketler.Toprak_Azot_Onarimi.rotasyon_3_yil,
      onerilen_ekim_bicimi_kodu: paketler.Toprak_Azot_Onarimi.onerilen_ekim_bicimi,
      onerilen_sulama_bicimi_kodu: paketler.Toprak_Azot_Onarimi.onerilen_sulama_bicimi,
      neden_onerildi: paketler.Toprak_Azot_Onarimi.aciklama,
      ...evaluateQuick(paketler.Toprak_Azot_Onarimi.rotasyon_3_yil, activeMode),
    },
  ];

  return {
    metadata: master.metadata,
    tespit_edilen_il: {
      plaka: bestPlaka,
      il_adi: kc.il_adi,
      cografi_bolge: kc.cografi_bolge,
      havza_kodu: basinCode,
      havza_adi: basinData.havza_adi,
      tagem_iklim_kodu: kc.tagem_iklim_kodu,
      onemli_tarim_ovalari: kc.onemli_tarim_ovalari,
      ortalama_tarim_rakimi_m: kc.ortalama_tarim_rakimi_m,
      ortalama_egim_yuzde: kc.ortalama_egim_yuzde,
      srtm_erozyon_sinifi: kc.srtm_erozyon_sinifi,
      il_merkezine_mesafe_km: Number(bestDist.toFixed(1)),
      il_ozel_tarimsal_not: matris.il_ozel_tarimsal_not,
      yerel_hastalik_zararli_uyarisi: matris.yerel_hastalik_zararli_uyarisi,
    },
    toprak_profili_0_30cm_soilgrids: soil,
    iklim_ve_su_serisi_2005_2026: clim,
    uydu_gozlem_smap_hls_ecostress: sat,
    projeksiyon_2035_cmip6: cmip6,
    il_urun_verim_su_ve_rotasyon_matrisi: matris,
    ciftci_plani_analizi: farmerEval,
    alternatif_senaryolar: scenarios,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat") ?? "37.5677");
    const lon = Number(searchParams.get("lon") ?? "32.7804");
    const alan_dekar = Number(searchParams.get("alan_dekar") ?? "100");
    const ekim_bicimi = (searchParams.get("ekim_bicimi") ?? "geleneksel_surum") as ParcelAnalyzeRequest["ekim_bicimi"];
    const sulama_bicimi = (searchParams.get("sulama_bicimi") ?? "yagmurlama") as ParcelAnalyzeRequest["sulama_bicimi"];
    const iklim_modu = (searchParams.get("iklim_modu") ?? "tipik") as ParcelAnalyzeRequest["iklim_modu"];

    const fallbackResult = await runTypeScriptMasterFallback(
      { lat, lon, alan_dekar, ekim_bicimi, sulama_bicimi, iklim_modu },
      ["Bugday", "Nohut", "Aycicegi"],
    );
    return NextResponse.json(fallbackResult, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen sunucu hatası";
    return NextResponse.json({ error: "Parsel analiz hatası", details: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ParcelAnalyzeRequest;

    if (typeof body.lat !== "number" || typeof body.lon !== "number") {
      return NextResponse.json(
        { error: "Geçersiz koordinatlar: 'lat' ve 'lon' sayısal olmalıdır." },
        { status: 400 },
      );
    }

    const cropsList = body.secilen_urunler ?? body.mevcut_plan ?? ["Bugday", "Nohut", "Aycicegi"];
    if (!Array.isArray(cropsList) || cropsList.length !== 3) {
      return NextResponse.json(
        { error: "'secilen_urunler' veya 'mevcut_plan' tam olarak 3 yıllık ürün dizisi içermelidir." },
        { status: 400 },
      );
    }

    const normalizedPayload = {
      ...body,
      secilen_urunler: cropsList,
    };

    const projectRoot = process.cwd();
    const engineScriptPath = path.join(projectRoot, "engine", "turkey_parcel_engine.py");
    const args = [engineScriptPath, "--json-input", JSON.stringify(normalizedPayload)];
    if (body.skip_live_api !== false) {
      args.push("--skip-live-api");
    }

    try {
      const { stdout } = await execFileAsync("python", args, {
        cwd: projectRoot,
        timeout: 12000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const result = JSON.parse(stdout);
      return NextResponse.json(result, { status: 200 });
    } catch {
      const fallbackResult = await runTypeScriptMasterFallback(body, cropsList);
      return NextResponse.json(fallbackResult, { status: 200 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatası";
    return NextResponse.json(
      { error: "Parsel karar destek analizi çalıştırılamadı.", details: message },
      { status: 500 },
    );
  }
}
