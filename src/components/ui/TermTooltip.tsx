"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  GLOSSARY_LIST,
  GLOSSARY_CATEGORY_LABELS,
  getGlossaryTerm,
  type GlossaryCategory,
  type GlossaryTermSpec,
} from "@/lib/ui/glossary";
import { Icon } from "@/components/ui/Icons";

export interface TermTooltipProps {
  /** Glossary term key or alias (e.g. 'ndvi', 'et0', 'taw', 'ky', 'topsis_pareto', 'salinity_ece', 'gdd') */
  termId: string;
  /** Optional custom inline label before the ? badge */
  label?: React.ReactNode;
  /** Visual variant for dark or light backgrounds */
  variant?: "light" | "dark" | "subtle";
  /** Size of the ? trigger badge */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Interactive `?` Hover & Focus Card explaining scientific/agronomic terms across AgroShift AI.
 * Uses React Portal + dynamic viewport collision detection so cards never clip inside overflow-hidden containers.
 */
export function TermTooltip({
  termId,
  label,
  variant = "light",
  size = "sm",
  className = "",
}: TermTooltipProps) {
  const term = getGlossaryTerm(termId);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom";
  }>({ top: 0, left: 0, placement: "top" });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const cardWidth = Math.min(360, window.innerWidth - 24);
    const estimatedHeight = 290;

    let left = rect.left + rect.width / 2 - cardWidth / 2;
    if (left < 12) left = 12;
    if (left + cardWidth > window.innerWidth - 12) {
      left = window.innerWidth - cardWidth - 12;
    }

    const spaceAbove = rect.top;
    const placement: "top" | "bottom" =
      spaceAbove >= estimatedHeight + 16 ? "top" : "bottom";
    const top = placement === "top" ? rect.top - 10 : rect.bottom + 10;

    setCoords({ top, left, placement });
  }, []);

  const handleOpen = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    computePosition();
    setOpen(true);
  }, [computePosition]);

  const handleCloseDelayed = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => computePosition();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, computePosition]);

  if (!term) {
    return label ? <span className={className}>{label}</span> : null;
  }

  const catStyle = GLOSSARY_CATEGORY_LABELS[term.category];

  const badgeSizeClasses =
    size === "md" ? "w-5 h-5 text-[11px]" : "w-4 h-4 text-[10px]";

  const badgeVariantClasses =
    variant === "dark"
      ? "bg-emerald-900/90 text-emerald-200 border border-emerald-400/60 hover:bg-emerald-600 hover:text-white"
      : variant === "subtle"
        ? "bg-[#f0f5f0] text-[#2d5a3c] border border-[#c6dccb] hover:bg-[#196a3b] hover:text-white hover:border-[#196a3b]"
        : "bg-[#eaf3ec] text-[#196a3b] border border-[#b9d6c0] hover:bg-[#196a3b] hover:text-white hover:border-[#196a3b]";

  return (
    <span
      className={`inline-flex items-center gap-1 align-middle ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleCloseDelayed}
    >
      {label && <span>{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${term.symbol}: ${term.titleTr} terim açıklaması`}
        aria-expanded={open}
        data-testid={`term-tooltip-${term.id}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (open) {
            setOpen(false);
          } else {
            handleOpen();
          }
        }}
        onFocus={handleOpen}
        onBlur={handleCloseDelayed}
        className={`inline-flex items-center justify-center rounded-full font-extrabold leading-none transition-all duration-150 select-none cursor-help shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#196a3b]/40 ${badgeSizeClasses} ${badgeVariantClasses}`}
      >
        ?
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            data-testid={`term-tooltip-card-${term.id}`}
            onMouseEnter={handleOpen}
            onMouseLeave={handleCloseDelayed}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform:
                coords.placement === "top"
                  ? "translateY(-100%)"
                  : "translateY(0)",
              width: "min(360px, calc(100vw - 24px))",
              zIndex: 9999,
            }}
            className="rounded-2xl bg-white/98 backdrop-blur-md border border-[#bfd4c4] shadow-[0_18px_42px_-10px_rgba(16,42,26,0.28)] p-4 text-left animate-in fade-in duration-150"
          >
            {/* Top header: Category badge + Symbol */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.colorClass}`}
              >
                {term.categoryLabelTr}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#11261a] text-emerald-200 font-mono text-[10.5px] font-bold">
                {term.symbol}
              </span>
            </div>

            {/* Full title & Plain Explanation */}
            <div className="text-[13.5px] font-extrabold text-[#16291d] leading-snug mb-1.5">
              {term.titleTr}
            </div>
            <p className="text-[11.5px] text-[#35483a] leading-relaxed mb-2.5">
              {term.plainMeaningTr}
            </p>

            {/* Formula & Ideal Range Grid */}
            <div className="grid grid-cols-1 gap-1.5 bg-[#f5f8f4] border border-[#dce6dd] rounded-xl p-2.5 mb-2.5">
              <div className="flex items-start justify-between gap-2 text-[10.5px]">
                <span className="font-bold text-[#526557] shrink-0">
                  Birim / Denklem:
                </span>
                <span className="font-mono font-semibold text-[#16291d] text-right">
                  {term.unitOrFormula}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 text-[10.5px] pt-1 border-t border-[#e3ece4]">
                <span className="font-bold text-[#526557] shrink-0">
                  Optimal Aralık:
                </span>
                <span className="font-bold text-[#196a3b] text-right">
                  {term.idealRangeTr}
                </span>
              </div>
            </div>

            {/* Why It Matters for Parcel */}
            <div className="bg-[#eef6f0] border border-[#c8dfd0] rounded-xl px-2.5 py-2 mb-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#196a3b] mb-0.5">
                Tarla Kararına Etkisi
              </div>
              <div className="text-[11px] text-[#23382a] leading-snug font-medium">
                {term.decisionImpactTr}
              </div>
            </div>

            {/* Source Footer */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e5ede6] text-[10px] text-[#647768]">
              <span className="truncate font-medium">
                Kaynak: {term.sourceRef}
              </span>
              <span className="text-[#196a3b] font-bold shrink-0">
                AgroShift Sözlük
              </span>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

const CATEGORY_ORDER: GlossaryCategory[] = [
  "climate_water",
  "soil_hydrology",
  "satellite",
  "agronomy_rotation",
  "economics_decision",
];

/**
 * Top-bar trigger button & searchable modal dictionary of all agronomic, hydrological, satellite, and economic terms.
 */
export function GlossaryTriggerButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    GlossaryCategory | "all"
  >("all");

  const filteredTerms = GLOSSARY_LIST.filter((t) => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.titleTr.toLowerCase().includes(q) ||
      t.titleEn.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      t.plainMeaningTr.toLowerCase().includes(q) ||
      t.decisionImpactTr.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-glossary-modal-btn"
        className="inline-flex items-center gap-1.5 bg-[#f2f7f3] hover:bg-[#e3efe6] text-[#196a3b] border border-[#c6dccb] rounded-xl px-2.5 py-1.5 text-[12px] font-bold transition-colors cursor-pointer"
        title="Sitedeki bilimsel ve tarımsal terimlerin açıklamalarını görüntüle"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#196a3b] text-white text-[10px] font-extrabold leading-none">
          ?
        </span>
        <span className="hidden sm:inline">Terimler Sözlüğü</span>
        <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-[#cde0d1] text-[#285e3c]">
          {GLOSSARY_LIST.length}
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="AgroShift AI Bilimsel ve Tarımsal Terimler Sözlüğü"
              data-testid="glossary-modal-dialog"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl max-h-[88vh] bg-[#f8faf7] border border-[#c6d6c8] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#11261a] via-[#173824] to-[#1e4b30] px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 mb-0.5">
                    <Icon name="sprout" size={14} />
                    Interaktif Agronomi &amp; Hidroloji Rehberi
                  </div>
                  <h2 className="text-[17px] sm:text-[19px] font-extrabold tracking-tight">
                    Bilimsel Terimler ve Semboller Sözlüğü ({GLOSSARY_LIST.length}{" "}
                    Terim)
                  </h2>
                  <p className="text-[12px] text-emerald-100/85">
                    Platformdaki tüm{" "}
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold mx-0.5">
                      ?
                    </span>{" "}
                    ikonlarının üzerine gelerek veya buradan arayarak terimlerin
                    çiftçi ve mühendis açıklamalarını inceleyebilirsiniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold border border-white/15 cursor-pointer"
                >
                  Kapat (ESC)
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="px-5 py-3 bg-white border-b border-[#dde6de] flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <span className="text-[#647768] absolute left-3 top-1/2 -translate-y-1/2">
                    <Icon name="search" size={15} />
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Terim, sembol veya formül ara (örn. NDVI, ET0, TAW, Ky, TOPSIS, GDD, Tuzluluk)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f4f7f3] border border-[#cedbce] text-[12.5px] text-[#18291e] font-medium focus:outline-none focus:border-[#196a3b]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors cursor-pointer ${
                      activeCategory === "all"
                        ? "bg-[#196a3b] text-white"
                        : "bg-[#f1f5f1] text-[#455849] hover:bg-[#e4ece5]"
                    }`}
                  >
                    Tümü ({GLOSSARY_LIST.length})
                  </button>
                  {CATEGORY_ORDER.map((catId) => (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => setActiveCategory(catId)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors cursor-pointer ${
                        activeCategory === catId
                          ? "bg-[#196a3b] text-white"
                          : "bg-[#f1f5f1] text-[#455849] hover:bg-[#e4ece5]"
                      }`}
                    >
                      {GLOSSARY_CATEGORY_LABELS[catId].tr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Term Cards Grid */}
              <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTerms.map((term: GlossaryTermSpec) => {
                  const catStyle = GLOSSARY_CATEGORY_LABELS[term.category];
                  return (
                    <div
                      key={term.id}
                      className="rounded-xl bg-white border border-[#d6e2d7] p-4 shadow-2xs hover:border-[#8eb89a] transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.colorClass}`}
                          >
                            {term.categoryLabelTr}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#132a1c] text-emerald-200 font-mono text-[11px] font-bold">
                            {term.symbol}
                          </span>
                        </div>
                        <h3 className="text-[14px] font-extrabold text-[#16291d] mb-1">
                          {term.titleTr}
                        </h3>
                        <p className="text-[11.5px] text-[#435648] leading-relaxed mb-3">
                          {term.plainMeaningTr}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2.5 border-t border-[#ebf1ec]">
                        <div className="flex items-center justify-between gap-2 text-[10.5px]">
                          <span className="font-bold text-[#586b5c] shrink-0">
                            Birim / Denklem:
                          </span>
                          <span className="font-mono font-semibold text-[#16291d] text-right">
                            {term.unitOrFormula}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[10.5px]">
                          <span className="font-bold text-[#586b5c] shrink-0">
                            Optimal Aralık:
                          </span>
                          <span className="font-bold text-[#196a3b] text-right">
                            {term.idealRangeTr}
                          </span>
                        </div>
                        <div className="bg-[#f2f8f4] border border-[#d1e4d6] rounded-lg px-2.5 py-1.5 text-[11px] text-[#213829] flex items-start gap-1.5">
                          <span className="text-[#196a3b] shrink-0 mt-0.5">
                            <Icon name="check" size={14} />
                          </span>
                          <span>{term.decisionImpactTr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
