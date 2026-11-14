"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Info, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type ProvenanceKind = "observed" | "reanalysis" | "model" | "scenario" | "unavailable";

const PROVENANCE_STYLES: Record<ProvenanceKind, { bg: string; text: string; border: string; tr: string; en: string }> = {
  observed: {
    bg: "bg-[#EBF4ED]",
    text: "text-[#123D2A]",
    border: "border-[#C4DEC9]",
    tr: "Gözlemsel Veri",
    en: "Observed Data",
  },
  reanalysis: {
    bg: "bg-[#EDF4FA]",
    text: "text-[#0A537E]",
    border: "border-[#C5DDF0]",
    tr: "Yeniden Analiz / Uydu",
    en: "Reanalysis / Satellite",
  },
  model: {
    bg: "bg-[#F3F5EE]",
    text: "text-[#397A42]",
    border: "border-[#D5E0C7]",
    tr: "Model Göstergesi",
    en: "Model Indicator",
  },
  scenario: {
    bg: "bg-[#FDF6E7]",
    text: "text-[#8A521B]",
    border: "border-[#F0D9A8]",
    tr: "Senaryo Çıktısı",
    en: "Scenario Output",
  },
  unavailable: {
    bg: "bg-[#FDECEA]",
    text: "text-[#A61B1B]",
    border: "border-[#F5C6C2]",
    tr: "Ölçüm Mevcut Değil",
    en: "Unavailable",
  },
};

export function ProvenanceBadge({ kind, label }: { kind: ProvenanceKind; label?: string }) {
  const { lang } = useI18n();
  const s = PROVENANCE_STYLES[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${s.bg} ${s.text} ${s.border}`}
    >
      {label ?? (lang === "tr" ? s.tr : s.en)}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0 space-y-1.5">
        {(eyebrow || badge) && (
          <div className="flex flex-wrap items-center gap-2">
            {eyebrow && (
              <span className="text-[12px] font-semibold tracking-wide text-[#397A42]">
                {eyebrow}
              </span>
            )}
            {badge}
          </div>
        )}
        <h1 className="font-display text-[24px] font-bold tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-[14px] leading-relaxed text-ink-2">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  sub,
  provenance,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  provenance?: ProvenanceKind;
  icon?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneBorder =
    tone === "good"
      ? "border-[#397A42]/30"
      : tone === "warn"
        ? "border-[#b76e00]/30"
        : tone === "bad"
          ? "border-[#c62828]/35"
          : "border-line";

  return (
    <div className={`rounded-2xl border ${toneBorder} bg-surface p-4 shadow-xs`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-2">{label}</span>
        {icon && <span className="text-[#397A42]">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
        <span className="font-display text-[24px] font-bold tracking-tight text-ink">
          {value}
        </span>
        {unit && <span className="text-[13px] font-medium text-ink-2">{unit}</span>}
      </div>
      {(sub || provenance) && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
          {sub && <span className="text-[12px] text-ink-2">{sub}</span>}
          {provenance && <ProvenanceBadge kind={provenance} />}
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-xs ${className}`}>
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
        </div>
        {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyFieldBanner({
  onSelectExample,
}: {
  onSelectExample?: () => void;
}) {
  const { lang } = useI18n();
  const tr = lang === "tr";
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4ED] px-3 py-1 text-[12px] font-semibold text-[#123D2A]">
            <Info className="size-3.5" />
            {tr ? "Aktif Tarla Seçilmedi" : "No Active Parcel Selected"}
          </div>
          <h2 className="font-display text-[20px] font-bold text-ink">
            {tr ? "Analize başlamak için bir arazi seçin veya çizin" : "Select or draw a parcel to begin analysis"}
          </h2>
          <p className="max-w-2xl text-[14px] text-ink-2">
            {tr
              ? "Gerçek uydu, toprak ve iklim verilerini yüklemek için haritadan bir parsel seçebilir veya Konya–Çumra örnek arazisini açabilirsiniz."
              : "Pick a parcel on the map or load the Konya–Çumra example field to fetch real satellite, soil, and climate data."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {onSelectExample && (
            <button type="button" onClick={onSelectExample} className="btn btn-primary">
              <Sparkles className="size-4" />
              {tr ? "Konya–Çumra Örneğini Aç" : "Open Konya–Çumra Example"}
            </button>
          )}
          <Link href="/tarlalarim" className="btn">
            {tr ? "Haritada Tarla Seç" : "Select on Map"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function StatusNotice({
  kind,
  title,
  message,
}: {
  kind: "info" | "warn" | "error" | "success";
  title: string;
  message: string;
}) {
  const styles =
    kind === "error"
      ? "border-[#c62828]/30 bg-[#fdecea] text-[#7f1d1d]"
      : kind === "warn"
        ? "border-[#b76e00]/30 bg-[#fdf6e7] text-[#784400]"
        : kind === "success"
          ? "border-[#397A42]/30 bg-[#ebf4ed] text-[#123D2A]"
          : "border-line bg-surface-2 text-ink";

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3.5 text-[13px] ${styles}`}>
      {kind === "success" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 opacity-90">{message}</div>
      </div>
    </div>
  );
}
