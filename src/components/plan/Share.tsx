"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { encodeField, useStore } from "@/lib/ui/fieldStore";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icons";
import { headline } from "./Verdict";
import { Timeline } from "./Timeline";
import { WindowStrip } from "./Compare";
import { planLabel, signed, useL } from "./planKit";
import { outOf } from "./units";

function useShareText(r: AnalysisResult) {
  const { t, n, lang } = useI18n();
  const s = useStore();
  const best = r.alternatives[0];
  if (!best || !s.field) return { text: "", link: "" };
  const link = typeof window !== "undefined" ? `${window.location.origin}/plan#${encodeField(s.field)}` : "";
  const tr = best.trade;
  const da = s.inputs.areaOverrideDa ?? s.field.areaDa;
  const text = t("share.text", {
    field: s.field.name,
    da: n(da),
    seq: planLabel(best, lang),
    w: tr?.waterDiffM3PerDaPerYr != null ? signed(tr.waterDiffM3PerDaPerYr, n) : "–",
    m: tr?.marginDiffTLPerDaPerYr != null ? signed(tr.marginDiffTLPerDaPerYr, n) : "–",
    ok: tr ? outOf(tr.okWindowsPlan, tr.windows, lang) : "–",
    link,
  });
  return { text, link };
}

/** Output actions: one-page A4 print and a prefilled WhatsApp message (the person taps send). */
export function ShareBar({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();
  const { text } = useShareText(result);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("share.group")}>
      <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
        <Icon name="share" size={18} />
        {t("share.wa")}
      </a>
      <button type="button" className="btn" onClick={() => window.print()}>
        <Icon name="print" size={18} />
        {t("share.print")}
      </button>
      {canShare && (
        <button type="button" className="btn" onClick={() => void navigator.share({ text }).catch(() => undefined)}>
          <Icon name="share" size={18} />
          {t("share.other")}
        </button>
      )}
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          });
        }}
      >
        <Icon name={copied ? "check" : "copy"} size={18} />
        {copied ? t("share.copied") : t("share.copy")}
      </button>
    </div>
  );
}

/** Print-only one-page A4 report (white ground, black text, patterns survive greyscale). */
export function PrintReport({ result, frost }: { result: AnalysisResult; frost: boolean[] }) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const s = useStore();
  const best = result.alternatives[0];
  const { link } = useShareText(result);
  if (!best || !s.field) return null;
  const tr = best.trade;
  const da = s.inputs.areaOverrideDa ?? s.field.areaDa;
  const today = new Date().toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="print-only text-[10pt] leading-snug text-black" aria-hidden="true">
      <div className="flex items-start justify-between border-b border-black pb-2">
        <div>
          <p className="text-[16pt] font-semibold">{s.field.name}</p>
          <p>
            {n(da)} {t("u.dekar")} · {t("print.date", { d: today })} · {t(`sc.${s.scenario.preset}`)}
          </p>
        </div>
        <Logo variant="horizontal" size={22} tone="dark" title="AgroShift" />
      </div>
      <p className="mt-3 text-[14pt] font-semibold leading-tight">{headline(best, lang, t, n)}</p>
      {tr && (
        <p className="mt-1">
          {t("print.nums", { w: signed(tr.waterDiffM3PerDaPerYr ?? 0, n), m: signed(tr.marginDiffTLPerDaPerYr ?? 0, n), ok: outOf(tr.okWindowsPlan, tr.windows, lang), okc: outOf(tr.okWindowsCurrent, tr.windows, lang) })}
        </p>
      )}
      {best.narrative && (
        <div className="mt-2 grid grid-cols-3 gap-3">
          {(
            [
              ["v.gains", best.narrative.gains],
              ["v.losses", best.narrative.losses],
              ["v.watch", best.narrative.watch],
            ] as const
          ).map(([k, items]) => (
            <div key={k}>
              <p className="font-semibold">{t(k)}</p>
              <ul className="mt-0.5 list-disc pl-4 text-[9pt]">
                {items.slice(0, 4).map((x, i) => (
                  <li key={i}>{L(x.text)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2">
        <Timeline
          frostMonths={frost}
          rows={[result.current, best].map((p) => ({ id: p.id, title: p.kind === "current" ? t("plan.mine") : t("plan.rec", { n: 1 }), calendar: p.calendar, monthly: p.monthlyDemand ?? null }))}
        />
      </div>
      <div className="mt-2">
        <WindowStrip result={result} plans={[result.current, best]} />
      </div>
      <p className="mt-2 text-[9pt]">
        <strong>{t("print.assumptions")}</strong> {t("print.assumptionsBody", { rain: t(`v.rain.${s.precip.mode}`), budget: s.inputs.rainfed ? t("q.water.none") : `${n(s.inputs.budget)} ${t("u.tonDa")}` })}
      </p>
      <p className="mt-1 text-[9pt]">{t("print.sources")}</p>
      <p className="mt-2 border-t border-black pt-1 text-[9pt]">
        <strong>{t("judgment.title")}</strong> {t("v3.judgment.body")} {link && <span className="break-all">{link}</span>}
      </p>
    </div>
  );
}
