"use client";

import { CROPS } from "@/lib/engine";
import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { ChartCard, CHART_FONT, GridY, linear, niceTicks, SimpleTable, Swatch, useWidth } from "@/components/charts/chartKit";

const M = { l: 62, r: 16, t: 14, b: 40 };

export function ParetoChart({ result }: { result: AnalysisResult }) {
  const { t, n, L } = useI18n();
  const [ref, w] = useWidth<HTMLDivElement>();
  const H = 340;
  const plans: { p: PlanResult; mark: string }[] = [
    { p: result.current, mark: "M" },
    ...result.alternatives.map((p) => ({ p, mark: String(p.rank) })),
    ...result.userPlans.map((p, i) => ({ p, mark: `S${result.userPlans.length > 1 ? i + 1 : ""}` })),
  ];
  const planPts = plans
    .filter(({ p }) => p.water.requirementMmPerYr && p.economics.grossMarginTLPerDaPerYr)
    .map(({ p, mark }) => ({ x: p.water.requirementMmPerYr!.p50, y: p.economics.grossMarginTLPerDaPerYr!.p50, soil: p.soilHealth.score, mark, p }));
  const all = [...result.candidates.map((c) => ({ x: c.requirementMmPerYr, y: c.grossMarginTLPerDaPerYr })), ...planPts];
  if (!all.length) return null;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const xt = niceTicks(Math.min(0, ...xs), Math.max(...xs), 5);
  const yt = niceTicks(Math.min(...ys), Math.max(...ys), 5);
  const x = linear(xt[0], xt.at(-1)!, M.l, w - M.r);
  const y = linear(yt[0], yt.at(-1)!, H - M.b, M.t);
  const r = (soil: number) => 3 + (soil / 100) * 7;
  const screening = result.candidates.filter((c) => c.basis === "screening");
  const name = (crops: readonly string[]) => crops.map((c) => L(CROPS[c as keyof typeof CROPS].name)).join(", ");

  return (
    <ChartCard
      title={t("pareto.title")}
      legend={
        <>
          <Swatch color="var(--c-muted)" label={t("pareto.screen")} />
          <Swatch color="var(--c-green)" label={t("pareto.front")} />
          <span>
            <b className="text-ink">M</b> {t("pareto.current")}, <b className="text-ink">1–3</b> {t("pareto.rec")}, <b className="text-ink">S</b> {t("pareto.user")}
          </span>
        </>
      }
      footer={<p className="max-w-[75ch]">{t("pareto.lead")}</p>}
      table={
        <SimpleTable
          head={["", t("pareto.rotation"), t("pareto.x"), t("pareto.y"), t("pareto.soilCol")]}
          rows={[
            ...planPts.map((p) => [p.mark, name(p.p.crops), n(p.x), n(p.y), n(p.soil)]),
            ...result.pareto.map((c) => ["P", name(c.crops), n(c.requirementMmPerYr), n(c.grossMarginTLPerDaPerYr), n(c.soilHealth)]),
          ]}
        />
      }
    >
      <div ref={ref} className="w-full">
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label={t("pareto.title")}>
            <GridY ticks={yt} y={y} x0={M.l} x1={w - M.r} fmt={(v) => n(v)} />
            {xt.map((v) => (
              <g key={v} aria-hidden="true">
                <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} stroke="var(--rule)" strokeWidth={0.6} />
                <text x={x(v)} y={H - M.b + 16} textAnchor="middle" fontSize={CHART_FONT} fill="var(--ink-2)">
                  {n(v)}
                </text>
              </g>
            ))}
            <text x={(M.l + w - M.r) / 2} y={H - 6} textAnchor="middle" fontSize={CHART_FONT} fill="var(--ink-2)">
              {t("pareto.x")}
            </text>
            <text transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={CHART_FONT} fill="var(--ink-2)">
              {t("pareto.y")}
            </text>
            {screening.map((c) => (
              <circle key={c.id} cx={x(c.requirementMmPerYr)} cy={y(c.grossMarginTLPerDaPerYr)} r={2} fill="var(--c-muted)" opacity={0.55} />
            ))}
            {result.pareto.map((c) => (
              <circle key={c.id} cx={x(c.requirementMmPerYr)} cy={y(c.grossMarginTLPerDaPerYr)} r={r(c.soilHealth)} fill="var(--c-green)" fillOpacity={0.25} stroke="var(--c-green)" strokeWidth={1.5}>
                <title>{`${name(c.crops)}: ${n(c.requirementMmPerYr)} mm, ${n(c.grossMarginTLPerDaPerYr)} TL/da, ${t("pareto.soilCol")} ${n(c.soilHealth)}`}</title>
              </circle>
            ))}
            {planPts.map((p) => (
              <g key={p.mark}>
                <circle cx={x(p.x)} cy={y(p.y)} r={r(p.soil) + 3} fill={p.mark === "M" ? "var(--panel)" : "var(--sky)"} stroke={p.mark === "M" ? "var(--ink)" : "var(--panel)"} strokeWidth={2} strokeDasharray={p.mark === "M" ? "3 2" : undefined}>
                  <title>{`${p.mark}: ${name(p.p.crops)}: ${n(p.x)} mm, ${n(p.y)} TL/da, ${t("pareto.soilCol")} ${n(p.soil)}`}</title>
                </circle>
                <text x={x(p.x)} y={y(p.y)} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={700} fill={p.mark === "M" ? "var(--ink)" : "var(--panel)"} aria-hidden="true">
                  {p.mark}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </ChartCard>
  );
}
