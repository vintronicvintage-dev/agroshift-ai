"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { closeIntro, useIntroOpen } from "@/lib/ui/intro";
import { Wordmark } from "@/components/shell/Wordmark";
import { Chevron } from "@/components/ui/Glyphs";
import { IntroArt } from "./IntroArt";

const TOTAL = 4;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

interface Props {
  /** Name of the first bundled pilot, shown under the sample button (null while the index loads). */
  sampleName: string | null;
  onSample: () => void;
  onOwn: () => void;
}

/**
 * First-visit welcome: four full-screen slides. Always server-rendered; html[data-intro] decides
 * visibility before paint. While open, the rest of the page is inert and focus stays inside.
 */
export function Onboarding({ sampleName, onSample, onOwn }: Props) {
  const { t } = useI18n();
  const open = useIntroOpen();
  const [i, setI] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const wheelLock = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((k: number) => setI(Math.max(0, Math.min(TOTAL - 1, k))), []);
  const finish = useCallback((then?: () => void) => {
    closeIntro();
    setI(0);
    then?.();
  }, []);

  // Focus in, page inert, focus back out on close.
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const shell = Array.from(document.querySelectorAll<HTMLElement>("[data-shell]"));
    shell.forEach((el) => el.setAttribute("inert", ""));
    root.current?.focus({ preventScroll: true });
    return () => {
      shell.forEach((el) => el.removeAttribute("inert"));
      const back = returnTo.current;
      (back && back.isConnected ? back : document.getElementById("icerik"))?.focus({ preventScroll: true });
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finish();
      return;
    }
    const tag = (e.target as HTMLElement).tagName;
    if ((e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") && tag !== "INPUT") {
      e.preventDefault();
      go(i + 1);
      return;
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") && tag !== "INPUT") {
      e.preventDefault();
      go(i - 1);
      return;
    }
    if (e.key === "Tab" && root.current) {
      const items = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === root.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el || el.scrollHeight > el.clientHeight + 4) return; // the overlay scrolls itself on short screens
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 24 || e.timeStamp - wheelLock.current < 650) return;
    wheelLock.current = e.timeStamp;
    go(i + (d > 0 ? 1 : -1));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(i + (dx < 0 ? 1 : -1));
  };

  const titleId = `intro-t-${i}`;

  return (
    <div
      ref={root}
      className="intro outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby="intro-keys"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      <div className="mx-auto grid min-h-full w-full max-w-[1180px] grid-rows-[auto_1fr_auto] px-4 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-4">
          <span className="hidden sm:block">
            <Wordmark />
          </span>
          <span className="ml-auto flex items-center gap-2">
            {i < TOTAL - 1 && (
              <button type="button" className="btn" onClick={() => finish(onSample)}>
                {t("intro.sample")}
              </button>
            )}
            <button type="button" className="btn" onClick={() => finish()}>
              {t("intro.skip")}
            </button>
          </span>
        </header>

        <div className="grid items-center gap-6 py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
          <div className="mx-auto aspect-[480/420] w-full max-w-[22rem] md:order-2 md:max-w-none">
            <IntroArt slide={i} />
          </div>

          <div key={i} className="intro-slide min-w-0 md:order-1" aria-live="polite">
            <p className="font-serif text-lg text-ink-2 tabular-nums" aria-hidden="true">
              {t("intro.count", { n: i + 1, total: TOTAL })}
            </p>
            <h2 id={titleId} className="mt-2 font-serif text-[clamp(2rem,4.2vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-balance">
              {t(`intro.${i + 1}.t` as "intro.1.t")}
            </h2>
            {i === 0 && <p className="mt-5 max-w-[30ch] font-serif text-[clamp(1.25rem,2vw,1.6rem)] leading-snug text-ink">{t("intro.1.b")}</p>}
            {i === 1 && (
              <ol className="mt-6 space-y-4">
                {(["step.field", "step.compare", "step.evidence"] as const).map((k, j) => (
                  <li key={k} className="grid grid-cols-[2.25rem_1fr] items-baseline gap-3">
                    <span className="font-serif text-2xl font-semibold tabular-nums text-loam">{j + 1}</span>
                    <span className="text-lg leading-snug">
                      <strong className="font-semibold">{t(k)}.</strong> <span className="text-ink-2">{t(`intro.2.${j + 1}` as "intro.2.1")}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {i === 2 && (
              <ul className="mt-6 max-w-[40ch] space-y-3 text-lg leading-snug">
                {(["intro.3.1", "intro.3.2", "intro.3.3"] as const).map((k, j) => (
                  <li key={k} className={`flex gap-3 ${j === 2 ? "font-semibold" : ""}`}>
                    <span className="mt-[0.6em] h-px w-4 shrink-0 bg-ink-2" aria-hidden="true" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            )}
            {i === 3 && (
              <>
                <p className="mt-4 max-w-[36ch] text-lg leading-snug text-ink-2">{t("intro.4.b")}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <button type="button" className="btn btn-primary btn-lg flex-col items-start gap-0 rounded-2xl text-left" onClick={() => finish(onSample)}>
                    <span>{t("intro.sample")}</span>
                    {sampleName && <span className="text-sm font-normal opacity-90">{t("intro.sampleSub", { name: sampleName })}</span>}
                  </button>
                  <button type="button" className="btn btn-lg justify-center rounded-2xl" onClick={() => finish(onOwn)}>
                    {t("intro.own")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-rule py-4">
          <button type="button" className="btn" onClick={() => go(i - 1)} disabled={i === 0}>
            <Chevron dir="left" />
            {t("intro.prev")}
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL }, (_, k) => (
              <button
                key={k}
                type="button"
                className="tap grid h-8 w-8 place-items-center rounded-full"
                aria-label={t("intro.goto", { n: k + 1 })}
                aria-current={k === i ? "step" : undefined}
                onClick={() => go(k)}
              >
                <span className={`block h-2 rounded-full w-6 transition-[transform,background-color] duration-200 ease-out ${k === i ? "bg-accent" : "scale-x-[0.34] bg-ink-2/60"}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          {i < TOTAL - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => go(i + 1)}>
              {t("intro.next")}
              <Chevron />
            </button>
          ) : (
            <span className="w-[5.5rem]" aria-hidden="true" />
          )}
        </footer>
        <p id="intro-keys" className="sr-only">
          {t("intro.keys")}
        </p>
      </div>
    </div>
  );
}
