"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bot, Send, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { CROPS } from "@/lib/engine";
import { getClassicRegionalSequence, matchMasterProvince } from "@/lib/data/turkiyeAgroMaster";
import { useI18n } from "@/lib/i18n";
import { annualPrecipStats } from "@/lib/ui/calibration";
import { doyLabel, frostStats } from "@/lib/ui/derive";
import { describeRing } from "@/lib/ui/geo";
import { METHOD_EFF, pilotField, setField, useStore } from "@/lib/ui/fieldStore";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: { href: string; label: string }[];
}

export default function AssistantPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextIdRef = useRef(1);

  const result = data.analysis.result;
  const best = result?.alternatives[0] ?? null;
  const current = result?.current ?? null;
  const budgetNet = store.inputs.rainfed ? 0 : store.inputs.budget;

  const answerQuestion = (question: string) => {
    const q = question.toLowerCase();
    const uid = nextIdRef.current++;
    const userMsg: ChatMessage = { id: `u-${uid}`, role: "user", text: question };

    let replyText = "";
    let links: { href: string; label: string }[] = [{ href: "/dayanak", label: tr ? "Bilimsel Dayanak" : "Evidence" }];

    if (!store.field || !result) {
      replyText = tr
        ? "Şu anda aktif bir tarla seçili değil veya analiz henüz tamamlanmadı. Doğrulanmamış verilerden öneri üretemem; önce bir parsel seçin veya Konya–Çumra örneğini açın."
        : "No active parcel is selected or analysis has not finished yet. I cannot provide recommendations without verified model outputs.";
      links = [{ href: "/tarlalarim", label: tr ? "Tarla Seç" : "Select Field" }];
    } else if (q.includes("don") || q.includes("soğuk") || q.includes("iklim") || q.includes("yağış") || q.includes("frost") || q.includes("climate") || q.includes("rain")) {
      const climate = (data.climate.status === "ok" ? data.climate.data : null) ?? data.snapshot?.snap.climate ?? null;
      const frost = climate ? frostStats(climate) : null;
      const meanMm = climate ? annualPrecipStats(climate).meanMm : null;
      const precipMm = meanMm != null ? Math.round(meanMm) : null;
      const lastSpring = frost?.lastSpring ? doyLabel(frost.lastSpring.median, lang) : "—";
      const lastSpring90 = frost?.lastSpring ? doyLabel(frost.lastSpring.p90, lang) : "—";
      const firstAutumn = frost?.firstAutumn ? doyLabel(frost.firstAutumn.median, lang) : "—";
      replyText = tr
        ? `${store.field.name} parselinde NASA POWER günlük serisine göre yıllık ortalama yağış ${precipMm ?? "—"} mm'dir. Son bahar donu ortanca ${lastSpring} (10 yılın 9'unda ${lastSpring90} sonrası don yok), ilk güz donu ise ortanca ${firstAutumn} civarındadır.`
        : `For ${store.field.name}, NASA POWER daily records show ${precipMm ?? "—"} mm/yr mean rainfall. Median last spring frost is ${lastSpring} (90% frost-free after ${lastSpring90}), and median first autumn frost is ${firstAutumn}.`;
      links = [{ href: "/iklim", label: tr ? "İklim & Don Analizi" : "Climate & Frost" }];
    } else if (q.includes("neden") || q.includes("sıra") || q.includes("azot") || q.includes("baklagil") || q.includes("why") || q.includes("sequence") || q.includes("nitrogen")) {
      const yrText = best?.years
        ?.map((yr, idx) => {
          const name = tr ? CROPS[yr.cropId].name.tr.split(" (")[0] : CROPS[yr.cropId].name.en.split(" (")[0];
          const yld = Math.round((yr.yieldTHa?.p50 ?? 0) * 100);
          const irr = Math.round(yr.irrigationNetMm?.p50 ?? 0);
          const mrg = Math.round(yr.grossMarginTLPerDa?.p50 ?? 0);
          return tr
            ? `${idx + 1}. Yıl ${name} (~${n(yld, 0)} kg/da, ${irr > 0 ? `${irr} mm sulama` : "kuru tarım"}, ${n(mrg, 0)} ₺/da)`
            : `Year ${idx + 1} ${name} (~${n(yld, 0)} kg/da, ${irr > 0 ? `${irr} mm irr.` : "rainfed"}, ${n(mrg, 0)} TL/da)`;
        })
        .join(" → ");
      const nLow = best ? (best.soilHealth.nContributionKgHa.low / 10).toFixed(1) : "0";
      const nHigh = best ? (best.soilHealth.nContributionKgHa.high / 10).toFixed(1) : "0";
      replyText = tr
        ? `${store.field.name} için önerilen sıralama: ${yrText}. Bu dizilim hastalık döngüsünü kırarken toprağa yıllık ${nLow}–${nHigh} kg/da biyolojik azot katkısı sağlar (toprak sağlığı skoru: ${best?.soilHealth.score ?? "—"}/100).`
        : `Recommended sequence for ${store.field.name}: ${yrText}. It breaks disease cycles and adds ${nLow}–${nHigh} kg/da biological nitrogen (soil health score: ${best?.soilHealth.score ?? "—"}/100).`;
      links = [
        { href: "/plan", label: tr ? "3 Yıllık Plan" : "3-Year Plan" },
        { href: "/tarla", label: tr ? "Rotasyon Detayı" : "Rotation Detail" },
      ];
    } else if (q.includes("risk") || q.includes("zarar") || q.includes("kâr") || q.includes("kazanç") || q.includes("gelir") || q.includes("fiyat") || q.includes("profit") || q.includes("margin")) {
      const p10 = Math.round(best?.economics.grossMarginTLPerDaPerYr?.p10 ?? 0);
      const p50 = Math.round(best?.economics.grossMarginTLPerDaPerYr?.p50 ?? 0);
      const p90 = Math.round(best?.economics.grossMarginTLPerDaPerYr?.p90 ?? 0);
      const cvar = best?.robust ? Math.round(best.robust.cvar20MarginTLPerDaPerYr) : null;
      const centroid = describeRing(store.field.ring).centroid;
      const prov = matchMasterProvince(centroid.lat, centroid.lon);
      const classicSeq = getClassicRegionalSequence(centroid.lat, centroid.lon);
      const classicStr = classicSeq
        ? classicSeq.map((c) => (tr ? CROPS[c].name.tr.split(" (")[0] : CROPS[c].name.en.split(" (")[0])).join(" → ")
        : null;
      replyText = tr
        ? `${store.field.name} için önerilen rotada brüt kâr dağılımı: kötü yılda (P10) ${n(p10, 0)} ₺/da, ortanca (P50) ${n(p50, 0)} ₺/da, iyi yılda (P90) ${n(p90, 0)} ₺/da${cvar != null ? ` (CVaR20 kuyruk riski: ${n(cvar, 0)} ₺/da)` : ""}.${classicStr ? ` (${prov.province.kimlik_ve_cografya.il_adi} klasik il sırası: ${classicStr}.)` : ""}`
        : `For ${store.field.name}, gross margin ranges from ${n(p10, 0)} (P10) to ${n(p50, 0)} (P50) and ${n(p90, 0)} TL/da/yr (P90)${cvar != null ? `, with CVaR20 = ${n(cvar, 0)} TL/da` : ""}.${classicStr ? ` (${prov.province.kimlik_ve_cografya.il_adi} regional classic: ${classicStr}.)` : ""}`;
      links = [
        { href: "/ekonomi", label: tr ? "Verim & Ekonomi" : "Economics" },
        { href: "/risk", label: tr ? "Risk Simülasyonu" : "Risk Simulation" },
      ];
    } else if (q.includes("bütçe") || q.includes("aşıyor") || q.includes("aşım") || q.includes("sulama") || q.includes("damla") || q.includes("yağmurlama") || q.includes("su") || q.includes("budget") || q.includes("water") || q.includes("irrigation")) {
      const curDef = Math.round(current?.water.unmetDeficitMmPerYr?.p50 ?? 0);
      const bestDef = Math.round(best?.water.unmetDeficitMmPerYr?.p50 ?? 0);
      const eff = METHOD_EFF[store.inputs.method];
      const grossM3 = Math.round(budgetNet / eff);
      const curCrops = current?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ");
      const bestCrops = best?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ");
      replyText = tr
        ? `${store.field.name} tarlasında yıllık ${budgetNet} mm net sulama bütçesi (%${Math.round(eff * 100)} randımanla brüt ${grossM3} m³/da) altında mevcut planınız (${curCrops}) medyan +${curDef} mm su açığı üretiyor. Önerilen Alternatif 1 (${bestCrops}) ise +${bestDef} mm açıkla bütçeye daha yakındır. Hesaplama 2001–2024 NASA POWER günlük verisiyle FAO-56 su dengesinden üretilmiştir.`
        : `For ${store.field.name} under ${budgetNet} mm/yr net budget (${grossM3} m³/da gross at ${Math.round(eff * 100)}% efficiency), your current plan (${curCrops}) shows +${curDef} mm median unmet deficit, whereas Alternative 1 (${bestCrops}) reduces this to +${bestDef} mm using FAO-56 daily water balance on NASA POWER (2001–2024).`;
      links = [
        { href: "/sulama", label: tr ? "Sulama Yönetimi" : "Irrigation" },
        { href: "/plan", label: tr ? "Rotasyon Planı" : "Rotation Plan" },
      ];
    } else if (q.includes("toprak") || q.includes("eksik") || q.includes("fosfor") || q.includes("potasyum") || q.includes("ph") || q.includes("soil") || q.includes("lab")) {
      const ph = data.soil?.ph ?? "—";
      const soc = data.soil?.soc ?? "—";
      const clay = data.soil?.clay ?? "—";
      const sand = data.soil?.sand ?? "—";
      const srcLabel = data.soil?.origin === "user" ? (tr ? "Kullanıcı Laboratuvarı" : "User Lab") : "ISRIC SoilGrids 250m";
      replyText = tr
        ? `${srcLabel} (0–30 cm) verisine göre pH ${ph}, organik karbon (SOC) ${soc} g/kg, kil %${clay} ve kum %${sand} düzeyindedir. Ancak Fosfor (P), Potasyum (K) ve Tuzluluk (EC) uydu/SoilGrids verisiyle ölçülemez ve şu an "Ölçüm Mevcut Değil" durumundadır; bu parametreler için yerel laboratuvar analizi önerilir.`
        : `Based on ${srcLabel} (0–30 cm), pH is ${ph}, SOC is ${soc} g/kg, clay ${clay}%, sand ${sand}%. Phosphorus (P), Potassium (K), and Salinity (EC) are marked Unavailable because they require local lab testing.`;
      links = [{ href: "/toprak", label: tr ? "Toprak Analizi" : "Soil Analysis" }];
    } else {
      const bestCrops = best?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ");
      const bestMargin = Math.round(best?.economics.grossMarginTLPerDaPerYr?.p50 ?? 0);
      replyText = tr
        ? `${store.field.name} için en dengeli önerilen sıra ${bestCrops} şeklindedir. Senaryo çıktısı olarak medyan yıllık brüt kâr ${n(bestMargin, 0)} ₺/da ve toprak sağlığı model göstergesi ${best?.soilHealth.score ?? "—"}/100 olarak hesaplanmıştır. Don tarihleri, azot katkısı veya P10–P90 risk dağılımı hakkında da soru sorabilirsiniz.`
        : `For ${store.field.name}, the top-ranked sequence is ${bestCrops}, with a median scenario gross margin of ${n(bestMargin, 0)} TL/da/yr and a soil health model indicator of ${best?.soilHealth.score ?? "—"}/100. You can also ask about frost dates, nitrogen contribution, or P10–P90 risk.`;
      links = [
        { href: "/plan", label: tr ? "Planları Karşılaştır" : "Compare Plans" },
        { href: "/dayanak", label: tr ? "Bilimsel Dayanak" : "Evidence" },
      ];
    }

    const bid = nextIdRef.current++;
    const botMsg: ChatMessage = { id: `b-${bid}`, role: "assistant", text: replyText, links };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  const quickPrompts = tr
    ? [
        "Mevcut plan neden bütçeyi aşıyor?",
        "Neden bu 1→2→3 sırası ve azot katkısı önerildi?",
        "Bu parselde son bahar donu ne zaman?",
        "Kötü yılda (P10) kazanç ve risk nedir?",
        "Toprak analizimde hangi veriler eksik?",
      ]
    : [
        "Why does the current plan exceed the budget?",
        "Why this 1→2→3 sequence and nitrogen contribution?",
        "When is the last spring frost on this parcel?",
        "What is the P10 downside margin and risk?",
        "Which soil measurements are missing?",
      ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "Model Çıktılarına Dayalı Rehber" : "Model-Grounded Guidance"}
          title={tr ? "AgroShift AI Karar Asistanı" : "AgroShift AI Decision Assistant"}
          description={
            tr
              ? "Aktif tarlanızın gerçek NASA POWER, SoilGrids ve FAO-56 model sonuçlarına dayanarak sorularınızı yanıtlar; doğrulanmamış verilerden kesin hüküm üretmez."
              : "Answers questions strictly from your active field's NASA POWER, SoilGrids, and FAO-56 outputs without fabricating unverified claims."
          }
          badge={<ProvenanceBadge kind="model" label={tr ? "Kaynak Bağlantılı" : "Source-Cited"} />}
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <SectionCard
          title={tr ? "Bilimsel Soru-Cevap" : "Scientific Q&A"}
          subtitle={
            store.field
              ? `${tr ? "Aktif Tarla:" : "Active Parcel:"} ${store.field.name} (${budgetNet} mm/yıl)`
              : tr ? "Önce bir tarla seçin" : "Select a field first"
          }
          right={
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#397A42]">
              <ShieldCheck className="size-4" />
              {tr ? "Sıfır uydurma veri" : "Zero fabricated data"}
            </span>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => answerQuestion(p)}
                className="rounded-xl border border-line bg-bg px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:border-[#397A42]"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mb-4 max-h-[380px] space-y-3 overflow-y-auto rounded-xl border border-line bg-bg p-4">
            {messages.length === 0 ? (
              <div className="flex items-start gap-3 text-[13.5px] text-ink-2">
                <Bot className="mt-0.5 size-5 shrink-0 text-[#397A42]" />
                <p>
                  {tr
                    ? "Merhaba! Yukarıdaki hızlı sorulardan birini seçin veya tarlanızın su bütçesi, toprak profili ve ekim nöbeti hakkında soru sorun."
                    : "Hello! Pick a quick prompt above or ask about your parcel's water budget, soil profile, or rotation plan."}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-3.5 text-[13.5px] ${
                    m.role === "user"
                      ? "ml-auto max-w-[85%] bg-[#123D2A] text-white"
                      : "mr-auto max-w-[90%] border border-line bg-surface text-ink"
                  }`}
                >
                  <p className="leading-relaxed">{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {m.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 text-[11.5px] font-semibold text-[#123D2A] hover:border-[#397A42]"
                        >
                          {l.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) answerQuestion(input.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tr ? "Tarlanız hakkında bir soru yazın..." : "Ask a question about your parcel..."}
              className="field-input flex-1"
            />
            <button type="submit" className="btn btn-primary">
              <Send className="size-4" />
              {tr ? "Sor" : "Ask"}
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
