"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bot, Send, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { CROPS } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, useStore } from "@/lib/ui/fieldStore";

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
    } else if (q.includes("bütçe") || q.includes("aş") || q.includes("su") || q.includes("budget") || q.includes("water")) {
      const curDef = Math.round(current?.water.unmetDeficitMmPerYr?.p50 ?? 0);
      const bestDef = Math.round(best?.water.unmetDeficitMmPerYr?.p50 ?? 0);
      const curCrops = current?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ");
      const bestCrops = best?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ");
      replyText = tr
        ? `${store.field.name} tarlasında yıllık ${budgetNet} mm net sulama bütçesi altında mevcut planınız (${curCrops}) medyan +${curDef} mm su açığı üretiyor. Önerilen Alternatif 1 (${bestCrops}) ise +${bestDef} mm açıkla bütçeye daha yakındır. Hesaplama 2001–2024 NASA POWER günlük verisiyle FAO-56 su dengesinden üretilmiştir.`
        : `For ${store.field.name} under a ${budgetNet} mm/yr net budget, your current plan (${curCrops}) shows +${curDef} mm median unmet deficit, whereas Alternative 1 (${bestCrops}) reduces this to +${bestDef} mm using FAO-56 daily water balance on NASA POWER (2001–2024).`;
      links = [
        { href: "/sulama", label: tr ? "Sulama Yönetimi" : "Irrigation" },
        { href: "/plan", label: tr ? "Rotasyon Planı" : "Rotation Plan" },
      ];
    } else if (q.includes("toprak") || q.includes("eksik") || q.includes("fosfor") || q.includes("soil")) {
      const ph = data.soil?.ph ?? "—";
      const soc = data.soil?.soc ?? "—";
      replyText = tr
        ? `ISRIC SoilGrids 250m (0–30 cm) verisine göre pH ${ph} ve organik karbon (SOC) ${soc} g/kg düzeyindedir. Ancak Fosfor (P), Potasyum (K) ve Tuzluluk (EC) uydu/SoilGrids verisiyle ölçülemez ve şu an "Ölçüm Mevcut Değil" durumundadır; bu parametreler için yerel laboratuvar analizi önerilir.`
        : `Based on ISRIC SoilGrids 250m (0–30 cm), pH is ${ph} and SOC is ${soc} g/kg. Phosphorus (P), Potassium (K), and Salinity (EC) are marked Unavailable because they require local lab testing.`;
      links = [{ href: "/toprak", label: tr ? "Toprak Analizi" : "Soil Analysis" }];
    } else {
      const bestCrops = best?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ");
      const bestMargin = Math.round(best?.economics.grossMarginTLPerDaPerYr?.p50 ?? 0);
      replyText = tr
        ? `${store.field.name} için en dengeli önerilen sıra ${bestCrops} şeklindedir. Senaryo çıktısı olarak medyan yıllık brüt kâr ${n(bestMargin, 0)} ₺/da ve toprak sağlığı model göstergesi ${best?.soilHealth.score ?? "—"}/100 olarak hesaplanmıştır. Kesin ekim kararı öncesi yerel ziraat mühendisine danışmanız önerilir.`
        : `For ${store.field.name}, the top-ranked sequence is ${bestCrops}, with a median scenario gross margin of ${n(bestMargin, 0)} TL/da/yr and a soil health model indicator of ${best?.soilHealth.score ?? "—"}/100.`;
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
        "Toprak analizimde hangi veriler eksik?",
        "Önerilen 3 yıllık planın özeti nedir?",
      ]
    : [
        "Why does the current plan exceed the budget?",
        "Which soil measurements are missing?",
        "Summarize the recommended 3-year plan",
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
