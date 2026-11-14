"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import type { LonLat } from "@/lib/data/fieldTypes";
import { parseLatLon, parseRingText, ringProblem, type Ring } from "@/lib/ui/geo";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="sheet" aria-label={title} onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="p-5">
        <h2 className="display text-[24px]">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

const QUICK = [20, 50, 100, 150, 200, 300];

/** The no-drawing path: a tapped centre plus an area in dekar becomes a circle of that area. */
export function PinDialog({ onCancel, onDone }: { onCancel: () => void; onDone: (da: number) => void }) {
  const { t } = useI18n();
  const [v, setV] = useState("");
  const num = Number(v.replace(",", "."));
  const ok = v.trim() !== "" && Number.isFinite(num) && num >= 1 && num <= 50_000;
  return (
    <Modal title={t("pin.title")} onClose={onCancel}>
      <p className="mt-2 text-[14px] text-ink-2">{t("pin.lead")}</p>
      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={t("pin.quick")}>
        {QUICK.map((q) => (
          <button key={q} type="button" className={`btn ${String(q) === v ? "btn-primary" : ""}`} onClick={() => setV(String(q))}>
            {q} {t("u.da")}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-[14px] font-medium" htmlFor="pin-da">
        {t("pin.label")}
      </label>
      <input id="pin-da" className="input mt-1 max-w-[12rem]" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="100" autoFocus />
      <p className="mt-1.5 text-[13px] text-ink-2">{t("pin.help")}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          {t("draw.cancel")}
        </button>
        <button type="button" className="btn btn-primary" disabled={!ok} onClick={() => ok && onDone(num)}>
          {t("pin.make")}
        </button>
      </div>
    </Modal>
  );
}

/** Keyboard / screen-reader alternative to drawing: corners as lines of coordinates, or one centre point. */
export function CoordDialog({ center, onCancel, onRing, onPin }: { center: LonLat | null; onCancel: () => void; onRing: (r: Ring) => void; onPin: (p: LonLat) => void }) {
  const { t, n } = useI18n();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pt, setPt] = useState(center ? `${center.lat.toFixed(5)} ${center.lon.toFixed(5)}` : "");
  return (
    <Modal title={t("coord.title")} onClose={onCancel}>
      <p className="mt-2 text-[14px] text-ink-2">{t("coord.lead")}</p>
      <label className="mt-4 block text-[14px] font-medium" htmlFor="coord-ring">
        {t("coord.ring")}
      </label>
      <textarea
        id="coord-ring"
        className="input mt-1 min-h-32 font-mono text-[14px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"37.5690 32.7650\n37.5690 32.7750\n37.5740 32.7750\n37.5740 32.7650"}
        spellCheck={false}
      />
      {err && (
        <p className="mt-1.5 text-[13px] font-medium text-bad" role="alert">
          {err}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const { ring, bad } = parseRingText(text);
            if (bad.length) return setErr(t("coord.bad", { lines: bad.join(", ") }));
            const pr = ringProblem(ring);
            if (pr) return setErr(t(`draw.err.${pr}`));
            onRing(ring);
          }}
        >
          {t("coord.makeRing")}
        </button>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <label className="block text-[14px] font-medium" htmlFor="coord-pt">
          {t("coord.point")}
        </label>
        <div className="mt-1 flex gap-2">
          <input id="coord-pt" className="input font-mono" value={pt} onChange={(e) => setPt(e.target.value)} spellCheck={false} />
          <button
            type="button"
            className="btn"
            onClick={() => {
              const p = parseLatLon(pt);
              if (!p) return setErr(t("coord.badPoint"));
              onPin(p);
            }}
          >
            {t("coord.usePoint")}
          </button>
        </div>
        {center && <p className="readout mt-1.5">{t("coord.center", { lat: n(center.lat, 4), lon: n(center.lon, 4) })}</p>}
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" className="btn" onClick={onCancel}>
          {t("common.close")}
        </button>
      </div>
    </Modal>
  );
}
