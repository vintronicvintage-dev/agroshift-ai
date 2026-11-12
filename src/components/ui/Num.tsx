"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const DURATION = 220;

/**
 * A number that eases to its new value when the scenario changes (220 ms, ease-out).
 * Formatting is the same as everywhere else; with reduced motion it jumps straight to the value.
 */
export function Num({ value, digits = 0, abs = false }: { value: number | null | undefined; digits?: number; abs?: boolean }) {
  const { n } = useI18n();
  const target = value === null || value === undefined || !Number.isFinite(value) ? null : abs ? Math.abs(value) : value;
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    const start = from.current;
    if (target === null || start === null || start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf.current = requestAnimationFrame(() => {
        from.current = target;
        setShown(target);
      });
      return () => cancelAnimationFrame(raf.current);
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / DURATION);
      const e = 1 - Math.pow(1 - k, 3);
      const v = start + (target - start) * e;
      from.current = v;
      setShown(v);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return <>{n(shown, digits)}</>;
}
