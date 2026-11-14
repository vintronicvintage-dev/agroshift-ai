"use client";

import Link from "next/link";
import { useState } from "react";
import { useFieldData } from "@/components/data/FieldData";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/ui/fieldStore";

export function FieldGuide() {
  const { lang, n, L } = useI18n();
  const { field } = useStore();
  const { analysis } = useFieldData();
  const [topic, setTopic] = useState<"water" | "plan" | "sources">("water");
  const tr = lang === "tr";
  const result = analysis.running || analysis.error ? null : analysis.result;
  const plan = result?.alternatives[0] ?? result?.current;
  const deficit = plan?.water.unmetDeficitMmPerYr;

  return (
    <section id="tarla-rehberi" className="field-guide" aria-labelledby="field-guide-title">
      <header>
        <h2 id="field-guide-title">{tr ? "Tarla rehberi" : "Field guide"}</h2>
        <p>{tr ? "Seçili tarlanın hesap sonuçlarından hazırlanan kısa yanıtlar." : "Short answers based on the selected field’s model results."}</p>
      </header>
      <div className="field-guide-body">
        <div className="field-guide-topics" role="group" aria-label={tr ? "Rehber konuları" : "Guide topics"}>
          <button type="button" className="btn" aria-pressed={topic === "water"} onClick={() => setTopic("water")}>{tr ? "Su açığı ne kadar?" : "How much water is missing?"}</button>
          <button type="button" className="btn" aria-pressed={topic === "plan"} onClick={() => setTopic("plan")}>{tr ? "Plan neden öne çıktı?" : "Why did this plan stand out?"}</button>
          <button type="button" className="btn" aria-pressed={topic === "sources"} onClick={() => setTopic("sources")}>{tr ? "Veriler nereden geliyor?" : "Where does the data come from?"}</button>
        </div>
        <div className="field-guide-answer" aria-live="polite">
          {topic === "sources" ? (
            <><p>{tr ? "Su hesabında NASA POWER iklim serisi ve FAO-56 yöntemi kullanılır. Toprak verisinin kaynağı ve ölçüm ölçeği Yöntem sayfasında açıklanır." : "The water model uses the NASA POWER climate series and FAO-56. The Methods page explains the soil data sources and measurement scale."}</p><Link href="/yontem">{tr ? "Yöntemi incele" : "Read the methods"}</Link></>
          ) : !field || !plan ? (
            <p>{!field ? (tr ? "Önce haritada bir tarla seç." : "Select a field on the map first.")
              : analysis.running ? (tr ? "Sonuçlar güncelleniyor." : "Results are updating.")
              : (tr ? "Bu tarla için henüz hesap sonucu yok." : "This field has no model results yet.")}</p>
          ) : topic === "plan" ? (
            <><p>{plan.narrative ? L(plan.narrative.verdict) : (tr ? "Bu planın açıklaması için karşılaştırma ekranını aç." : "Open the comparison to review this plan.")}</p><Link href="/plan">{tr ? "Planı incele" : "Review the plan"}</Link></>
          ) : (
            <><p>{deficit ? (tr
              ? `Gösterilen planın yıllık kalan su açığı medyanı ${n(deficit.p50)} mm. Tarihsel dönemlerin orta %80 aralığı ${n(deficit.p10)}–${n(deficit.p90)} mm.`
              : `The displayed plan has a median annual unmet water deficit of ${n(deficit.p50)} mm. The middle 80% of historical periods span ${n(deficit.p10)}–${n(deficit.p90)} mm.`)
              : (tr ? "Bu plan için su açığı hesaplanamadı." : "The water deficit is unavailable for this plan.")}</p><Link href="#field-shift-sonuclar">{tr ? "Sonuçları karşılaştır" : "Compare results"}</Link></>
          )}
        </div>
      </div>
    </section>
  );
}
