"""Independent FAO-56 Penman-Monteith cross-check for the AgroShift TS engine.

Written directly from FAO Irrigation and Drainage Paper 56 (Allen et al. 1998), Ch. 3-4,
without reference to src/lib/engine/et0.ts. Stdlib only.

Usage (from the agroshift/ directory):
    npx tsx scripts/dump-et0.ts > <tmp>/engine_et0.json
    python scripts/crosscheck_et0.py [<tmp>/engine_et0.json]

If no engine dump path is given the script runs `npx tsx scripts/dump-et0.ts` itself.
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP = os.path.join(ROOT, "src", "data", "snapshots", "konya-cumra.json")
VARS = ["tmax", "tmin", "tmean", "rh", "wind2m", "rs", "precip", "gwetRoot", "gwetTop"]
SIGMA = 4.903e-9  # MJ K-4 m-2 day-1


# ---------------------------------------------------------------- data
def load_snapshot(path: str = SNAP):
    with open(path, encoding="utf-8") as f:
        snap = json.load(f)
    c = snap["climate"]
    start = dt.date.fromisoformat(snap["start"])
    n = len(c["cols"]["tmax"])
    days = []
    for i in range(n):
        row = {"date": (start + dt.timedelta(days=i)).isoformat()}
        for k in VARS:
            v = c["cols"][k][i]
            row[k] = None if v is None else v / c["scales"][k]
        days.append(row)
    return snap, days


# ---------------------------------------------------------------- FAO-56 Ch. 3
def e0(t: float) -> float:  # Eq. 11, kPa
    return 0.6108 * math.exp(17.27 * t / (t + 237.3))


def et0_pm(d: dict, lat_deg: float, z: float) -> float | None:
    need = ("tmax", "tmin", "rh", "wind2m", "rs")
    if any(d[k] is None for k in need):
        return None
    tmax, tmin, rh, u2, rs = d["tmax"], d["tmin"], d["rh"], d["wind2m"], d["rs"]
    tmean = (tmax + tmin) / 2  # FAO-56 Eq. 9 (used in Eq. 6 and Eq. 13)
    p = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26  # Eq. 7
    gamma = 0.665e-3 * p  # Eq. 8
    es = (e0(tmax) + e0(tmin)) / 2  # Eq. 12
    ea = rh / 100 * es  # Eq. 19 (RHmean)
    delta = 4098 * e0(tmean) / (tmean + 237.3) ** 2  # Eq. 13
    j = dt.date.fromisoformat(d["date"]).timetuple().tm_yday
    phi = math.radians(lat_deg)
    dr = 1 + 0.033 * math.cos(2 * math.pi * j / 365)  # Eq. 23
    dec = 0.409 * math.sin(2 * math.pi * j / 365 - 1.39)  # Eq. 24
    ws = math.acos(max(-1.0, min(1.0, -math.tan(phi) * math.tan(dec))))  # Eq. 25
    ra = 24 * 60 / math.pi * 0.0820 * dr * (
        ws * math.sin(phi) * math.sin(dec) + math.cos(phi) * math.cos(dec) * math.sin(ws)
    )  # Eq. 21
    rso = (0.75 + 2e-5 * z) * ra  # Eq. 37
    rns = (1 - 0.23) * rs  # Eq. 38
    ratio = min(rs / rso, 1.0) if rso > 0 else 1.0
    rnl = (
        SIGMA * ((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2
        * (0.34 - 0.14 * math.sqrt(ea))
        * (1.35 * ratio - 0.35)
    )  # Eq. 39
    rn = rns - rnl  # Eq. 40
    g = 0.0
    num = 0.408 * delta * (rn - g) + gamma * 900 / (tmean + 273) * u2 * (es - ea)
    den = delta + gamma * (1 + 0.34 * u2)
    return max(0.0, num / den)  # Eq. 6


# ---------------------------------------------------------------- engine dump
def engine_dump(path: str | None):
    if path:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    out = subprocess.run(
        "npx tsx scripts/dump-et0.ts", cwd=ROOT, shell=True, capture_output=True, text=True, encoding="utf-8"
    )
    if out.returncode != 0:
        sys.exit(out.stderr)
    return json.loads(out.stdout)


# ---------------------------------------------------------------- Part 1: ET0
def part1(snap, days, eng):
    lat, z = snap["lat"], snap["elevation"]
    mine = {d["date"]: et0_pm(d, lat, z) for d in days}
    diffs, rel = [], []
    worst = (0, None)
    for date, v in eng["et0"].items():
        m = mine.get(date)
        if v is None or m is None:
            continue
        a = abs(v - m)
        diffs.append(a)
        if m > 0.5:
            rel.append(a / m)
        if a > worst[0]:
            worst = (a, date)
    print("=== Part 1: daily ET0, Konya-Cumra (%.2f, %.2f, %.0f m) ===" % (lat, snap["lon"], z))
    print("days compared:", len(diffs))
    print("max |diff| mm/d: %.4f (on %s)" % worst)
    print("mean |diff| mm/d: %.4f" % (sum(diffs) / len(diffs)))
    print("max rel diff (days ET0>0.5): %.3f%%" % (100 * max(rel)))
    print("year  python_ET0  engine_ET0  diff%   P(mm)")
    years = sorted({d[:4] for d in mine})
    for y in years:
        ds = [d for d in mine if d.startswith(y)]
        if len(ds) < 365:
            continue
        py = sum(mine[d] or 0 for d in ds)
        en = sum(eng["et0"].get(d) or 0 for d in ds)
        pr = sum(x["precip"] or 0 for x in days if x["date"].startswith(y))
        print("%s  %9.1f  %9.1f  %+6.2f  %6.1f" % (y, py, en, 100 * (en - py) / py, pr))
    return mine


# ---------------------------------------------------------------- Part 2: one wheat season
def saxton_rawls(sand, clay, om):
    """Saxton & Rawls (2006) Eq. 1-2, fractions; om in %."""
    S, C, OM = sand / 100, clay / 100, om
    t1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031
    wp = t1500 + (0.14 * t1500 - 0.02)
    t33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299
    fc = t33 + (1.283 * t33 ** 2 - 0.374 * t33 - 0.015)
    return fc, wp


def part2(snap, days, mine, eng):
    w = eng.get("wheat")
    if not w:
        print("engine dump has no wheat season; skipping part 2")
        return
    print()
    print("=== Part 2: winter wheat, rainfed, season sown %s ===" % w["sow"])
    p = w["params"]
    soil = snap["soil"]
    om = (soil["soc"] or 0) / 10 * 1.724  # g/kg SOC -> % OM (van Bemmelen)
    fc, wp = saxton_rawls(soil["sand"], soil["clay"], om)
    print("soil sand/clay/SOC: %s/%s/%s  -> my thetaFC=%.3f thetaWP=%.3f (engine %.3f/%.3f)"
          % (soil["sand"], soil["clay"], soil["soc"], fc, wp, w["thetaFC"], w["thetaWP"]))
    fc, wp = w["thetaFC"], w["thetaWP"]  # use engine soil so the water balance is comparable

    L = [p["lIni"], p["lDev"], p["lMid"], p["lLate"]]
    total = sum(L)
    sow = dt.date.fromisoformat(w["sow"])
    byd = {d["date"]: d for d in days}

    def kc(i):  # FAO-56 Eq. 66 piecewise linear
        if i < L[0]:
            return p["kcIni"]
        if i < L[0] + L[1]:
            return p["kcIni"] + (i - L[0]) / L[1] * (p["kcMid"] - p["kcIni"])
        if i < L[0] + L[1] + L[2]:
            return p["kcMid"]
        return p["kcMid"] + (i - L[0] - L[1] - L[2]) / L[3] * (p["kcEnd"] - p["kcMid"])

    def zr(i):  # linear root growth from zrMin to zrMax over ini+dev (FAO-56 Eq. 8-1 simplified)
        f = min(1.0, i / (L[0] + L[1]))
        return p["zrMin"] + f * (p["zrMax"] - p["zrMin"])

    # Simple single-bucket FAO-56 Ch. 8 water balance; start at the engine's initial depletion
    # fraction of TAW so the comparison isolates the in-season mechanics.
    dr_frac0 = w.get("initialDepletionFrac", 0.0)
    dr = None
    etc = eta = rain = perc = 0.0
    stress_days = 0
    for i in range(total):
        date = (sow + dt.timedelta(days=i)).isoformat()
        e = mine.get(date) or 0.0
        pr = byd[date]["precip"] or 0.0
        taw = 1000 * (fc - wp) * zr(i)
        if dr is None:
            dr = dr_frac0 * taw
        raw = p["p"] * taw
        ks = 1.0 if dr <= raw else max(0.0, (taw - dr) / ((1 - p["p"]) * taw))  # Eq. 84
        k = kc(i)
        etc += k * e
        eta_d = ks * k * e
        eta += eta_d
        rain += pr
        dr = dr - pr + eta_d  # Eq. 85, RO=0, I=0, CR=0
        if dr < 0:
            perc += -dr
            dr = 0.0
        dr = min(dr, taw)
        if ks < 1:
            stress_days += 1
    print("stage lengths ini/dev/mid/late = %s (total %d d); Kc %.2f/%.2f/%.2f; p=%.2f; Zr %.2f->%.2f m"
          % (L, total, p["kcIni"], p["kcMid"], p["kcEnd"], p["p"], p["zrMin"], p["zrMax"]))
    print("                   python(1-bucket)   engine")
    print("season ETc  (mm)   %10.1f        %10.1f" % (etc, w["etc"]))
    print("season ETa  (mm)   %10.1f        %10.1f" % (eta, w["eta"]))
    print("rain        (mm)   %10.1f        %10.1f" % (rain, w["precip"]))
    print("deep perc   (mm)   %10.1f        %10.1f" % (perc, w.get("deepPerc", float("nan"))))
    print("runoff      (mm)   %10.1f        %10.1f" % (0.0, w.get("runoff", float("nan"))))
    print("ETa/ETc            %10.3f        %10.3f" % (eta / etc, w["eta"] / w["etc"]))
    ky = p.get("ky")
    if ky is not None:
        print("yield ratio 1-Ky(1-ETa/ETc) %8.3f        %10.3f" % (max(0, 1 - ky * (1 - eta / etc)), w.get("yieldRatio", float("nan"))))
    print("stress days (Ks<1) %10d" % stress_days)

    # Variant B: same FAO-56 Ch. 8 daily balance, but with the engine's documented deviations
    # re-implemented independently: (1) a 1.5 m column whose layer below the roots starts at the
    # same wetness as the root zone and receives drainage (roots grow into stored water, not FC),
    # (2) SCS-CN runoff, (3) FAO-56 Table 22 p adjustment p = p_tab + 0.04(5 - ETc).
    zcol = 1.5
    tawm = 1000 * (fc - wp)
    cn = w.get("cnSmallGrain")
    s_cn = 25400 / cn - 254 if cn else None
    w0 = 1 - dr_frac0
    zr_prev = zr(0)
    root = w0 * tawm * 0.15  # engine starts with bare-soil top layer 0.15 m
    sub = w0 * tawm * (zcol - 0.15)
    ztop = 0.15
    etc_b = eta_b = perc_b = ro_b = 0.0

    def move(root, sub, ztop, z):
        if z > ztop:
            m = sub * (z - ztop) / (zcol - ztop)
            return root + m, sub - m
        m = root * (ztop - z) / ztop
        return root - m, sub + m

    for i in range(total):
        date = (sow + dt.timedelta(days=i)).isoformat()
        e = mine.get(date) or 0.0
        pr = byd[date]["precip"] or 0.0
        z = zr(i + 1)  # depth at end of day i (engine convention)
        root, sub = move(root, sub, ztop, z)
        ztop = z
        taw = tawm * z
        k = kc(i)
        etc_d = k * e
        pp = min(0.8, max(0.1, p["p"] + 0.04 * (5 - etc_d)))
        dr = max(0.0, taw - root)
        ks = 1.0 if dr <= pp * taw else max(0.0, (taw - dr) / ((1 - pp) * taw))
        a = ks * etc_d
        ro = 0.0
        if s_cn is not None and pr > 0.2 * s_cn:
            ro = (pr - 0.2 * s_cn) ** 2 / (pr + 0.8 * s_cn)
        root += pr - ro - a
        if root < 0:
            a += root
            root = 0.0
        if root > taw:
            sub += root - taw
            root = taw
            cap = tawm * (zcol - z)
            if sub > cap:
                perc_b += sub - cap
                sub = cap
        etc_b += etc_d
        eta_b += a
        ro_b += ro
    print("variant B (2-layer 1.5 m column, SCS-CN, p adj.; written independently):")
    print("  ETc %.1f  ETa %.1f  deep perc %.1f  runoff %.1f  ETa/ETc %.3f   vs engine %.1f / %.1f / %.1f / %.1f / %.3f"
          % (etc_b, eta_b, perc_b, ro_b, eta_b / etc_b, w["etc"], w["eta"], w["deepPerc"], w["runoff"], w["eta"] / w["etc"]))


if __name__ == "__main__":
    snap, days = load_snapshot()
    eng = engine_dump(sys.argv[1] if len(sys.argv) > 1 else None)
    mine = part1(snap, days, eng)
    part2(snap, days, mine, eng)
