"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { isoDay, type SourceRef } from "@/lib/ui/sources";

export interface Trace {
  title: string;
  value?: string;
  formula: string;
  inputs?: [string, string][];
  sources: SourceRef[];
  note?: string;
}

const Ctx = createContext<(t: Trace) => void>(() => {});

export function useTrace() {
  return useContext(Ctx);
}

export function TraceProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const { t } = useI18n();
  const open = useCallback((tr: Trace) => {
    setTrace(tr);
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <Ctx.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        className="trace"
        aria-labelledby="trace-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        {trace && (
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="trace-title" className="font-serif text-xl font-semibold leading-tight">
                  {trace.title}
                </h2>
                {trace.value && <p className="num-mid mt-2">{trace.value}</p>}
              </div>
              <form method="dialog">
                <button className="btn" autoFocus>
                  {t("trace.close")}
                </button>
              </form>
            </div>
            <h3 className="mt-5 text-sm font-semibold text-ink-2">{t("trace.formula")}</h3>
            <p className="prose-serif mt-1 text-[0.98rem]">{trace.formula}</p>
            {trace.note && <p className="mt-2 rounded-md bg-warn px-3 py-2 text-sm text-warn-ink">{trace.note}</p>}
            {trace.inputs && trace.inputs.length > 0 && (
              <>
                <h3 className="mt-5 text-sm font-semibold text-ink-2">{t("trace.inputs")}</h3>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {trace.inputs.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-2">{k}</dt>
                      <dd className="tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            <h3 className="mt-5 text-sm font-semibold text-ink-2">{t("trace.sources")}</h3>
            <ul className="mt-1 space-y-2 text-sm">
              {trace.sources.map((s, i) => (
                <li key={`${s.name}-${i}`}>
                  {s.url ? (
                    s.url.startsWith("/") ? (
                      <Link className="font-medium underline decoration-ink-2 underline-offset-2 hover:decoration-ink" href={s.url} onClick={() => ref.current?.close()}>
                        {s.name}
                      </Link>
                    ) : (
                      <a className="font-medium underline decoration-ink-2 underline-offset-2 hover:decoration-ink" href={s.url} target="_blank" rel="noreferrer">
                        {s.name}
                      </a>
                    )
                  ) : (
                    <span className="font-medium">{s.name}</span>
                  )}
                  {s.retrievedAt && <span className="text-ink-2">, {t("trace.retrieved", { d: isoDay(s.retrievedAt) })}</span>}
                  {s.provider && <div className="text-ink-2">{s.provider}</div>}
                  {s.detail && <div className="mt-0.5 text-ink-2">{s.detail}</div>}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm">
              <Link className="underline decoration-ink-2 underline-offset-2 hover:decoration-ink" href="/yontem" onClick={() => ref.current?.close()}>
                {t("trace.methods")}
              </Link>
            </p>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  );
}

/** A number (or any short content) that opens its trace when activated. */
export function Traced({ trace, children, className }: { trace: () => Trace; children: ReactNode; className?: string }) {
  const open = useTrace();
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`traced ${className ?? ""}`}
      onClick={() => open(trace())}
      title={t("trace.hint")}
    >
      {children}
    </button>
  );
}
