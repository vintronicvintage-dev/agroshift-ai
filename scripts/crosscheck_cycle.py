"""Independent cross-check of two engine v2 mechanisms (stdlib only).

Part A  layered soil hydraulics: Saxton & Rawls (2006) Eq. 1-5 per layer, density adjustment
        Eq. 6-10, coarse-fragment (gravel) volume correction, cumulative TAW(z).
Part B  repeating-cycle water carry-over: rainfed wheat -> fallow -> wheat on the layered profile
        over one phase chain of Konya-Cumra windows (AY y, y+3, y+6, ...). Year 3's final soil state
        is the start of year 1 of the next cycle; the first window starts from the periodic steady
        state (iterate the window from the GWETROOT seed until storage changes < 0.5 mm).
        Two-bucket column (root zone / below roots), water moved between buckets at uniform
        RELATIVE wetness, FAO-56 single Kc, Ks (Eq. 84), p adjustment, SCS-CN runoff, bare-soil
        evaporation with Kr (Eq. 74). ET0 from crosscheck_et0.py (independent FAO-56 PM).

Written from docs/engine-v2.md and FAO-56 / Saxton & Rawls, not from the TS source.

Usage (from agroshift/):
    npx tsx scripts/dump-cycle.ts > <tmp>/engine_cycle.json
    python scripts/crosscheck_cycle.py <tmp>/engine_cycle.json
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crosscheck_et0 import et0_pm, load_snapshot  # noqa: E402


# ------------------------------------------------------------------ Part A
def sr2006(sand_pct, clay_pct, om_pct):
    S, C, OM = sand_pct / 100, clay_pct / 100, min(8.0, max(0.0, om_pct))
    t1500 = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031
    wp = t1500 + (0.14 * t1500 - 0.02)                                     # Eq. 1
    t33 = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299
    fc = t33 + (1.283 * t33 ** 2 - 0.374 * t33 - 0.015)                     # Eq. 2
    ts33 = 0.278 * S + 0.034 * C + 0.022 * OM - 0.018 * S * OM - 0.027 * C * OM - 0.584 * S * C + 0.078
    s33 = ts33 + (0.636 * ts33 - 0.107)                                     # Eq. 3
    sat = fc + s33 - 0.097 * S + 0.043                                      # Eq. 5
    return fc, wp, sat


def layer(l, om_fallback):
    om = (l["soc"] / 10 * 1.724) if l.get("soc") is not None else om_fallback
    silt = l["silt"] if l.get("silt") is not None else 100 - l["sand"] - l["clay"]
    tot = l["sand"] + silt + l["clay"]
    fc, wp, sat = sr2006(l["sand"] / tot * 100, l["clay"] / tot * 100, om)
    df = None
    if l.get("bulkDensity"):
        rho_n = (1 - sat) * 2.65                                            # Eq. 6
        df = min(1.3, max(0.9, l["bulkDensity"] / rho_n))
        sat_df = 1 - rho_n * df / 2.65                                      # Eq. 7-8
        fc = max(wp + 0.01, fc - 0.2 * (sat - sat_df))                      # Eq. 9
    rv = (l.get("coarseFragments") or 0) / 100
    fc, wp = fc * (1 - rv), wp * (1 - rv)
    return {"top": l["top"], "bottom": l["bottom"], "fc": fc, "wp": wp, "taw": max(20.0, 1000 * (fc - wp)), "df": df}


def make_profile(layers):
    bounds, cum, per = [], [], []
    c = 0.0
    for i, l in enumerate(layers):
        top = 0.0 if i == 0 else layers[i - 1]["bottom"] / 100
        bounds.append(top); cum.append(c); per.append(l["taw"])
        c += l["taw"] * (l["bottom"] / 100 - top)

    def taw(z):
        i = len(bounds) - 1
        while i > 0 and z < bounds[i]:
            i -= 1
        return cum[i] + per[i] * (z - bounds[i])
    return taw


# ------------------------------------------------------------------ Part B
def run():
    eng = json.load(open(sys.argv[1], encoding="utf-8"))
    snap, days = load_snapshot()
    soc_top = snap["soil"]["soc"]
    om_fb = soc_top / 10 * 1.724 if soc_top is not None else eng["omDefaultPct"]
    mine = [layer(l, om_fb) for l in eng["layersInput"]]
    print("=== Part A: layered hydraulics (Konya test profile) ===")
    print("layer cm    thetaFC py/eng      thetaWP py/eng      TAW mm/m py/eng")
    worst = 0.0
    for a, b in zip(mine, eng["layers"]):
        print("%3d-%-3d  %.4f / %.4f   %.4f / %.4f   %6.1f / %6.1f"
              % (a["top"], a["bottom"], a["fc"], b["thetaFC"], a["wp"], b["thetaWP"], a["taw"], b["tawMmPerM"]))
        worst = max(worst, abs(a["taw"] - b["tawMmPerM"]))
    taw = make_profile(mine)
    for t in eng["tawAt"]:
        print("TAW(0-%.2f m): python %7.2f mm   engine %7.2f mm" % (t["z"], taw(t["z"]), t["taw"]))
        worst = max(worst, abs(taw(t["z"]) - t["taw"]))
    print("max |diff| %.2e mm" % worst)

    c, cr = eng["ctx"], eng["crop"]
    lat, z = snap["lat"], snap["elevation"]
    start0 = dt.date.fromisoformat(days[0]["date"])
    et0 = [et0_pm(d, lat, z) for d in days]
    pr = [d["precip"] or 0.0 for d in days]
    idx = lambda iso: (dt.date.fromisoformat(iso) - start0).days
    zcol, zbare = c["zCol"], c["zBare"]
    tawcol = taw(zcol)

    def ro(P, cn):
        s = 25400 / cn - 254
        return 0.0 if P <= 0.2 * s else (P - 0.2 * s) ** 2 / (P + 0.8 * s)

    def move(st, znew):  # uniform relative wetness in the bucket that loses depth
        top, sub, zt = st
        if znew > zt:
            cap = tawcol - taw(zt)
            m = sub * (taw(znew) - taw(zt)) / cap if cap > 0 else 0.0
            return [top + m, sub - m, znew]
        m = top * (taw(zt) - taw(znew)) / taw(zt) if taw(zt) > 0 else 0.0
        return [top - m, sub + m, znew]

    def bare(st, a, b, acc):
        st = move(st, zbare)
        tew = taw(zbare); rew = min(c["rew"], 0.8 * tew); cap = tawcol - tew
        for d in range(a, b):
            de = tew - st[0]
            kr = 1.0 if de <= rew else max(0.0, (tew - de) / (tew - rew))
            e = kr * c["keMax"] * et0[d]
            r = ro(pr[d], c["cnBare"])
            st[0] += pr[d] - r - e
            if st[0] < 0:
                e += st[0]; st[0] = 0.0
            if st[0] > tew:
                st[1] += st[0] - tew; st[0] = tew
                if st[1] > cap:
                    acc["dp"] += st[1] - cap; st[1] = cap
            acc["ro"] += r; acc["et"] += e
        return st

    def season(st, sow, L, acc):
        L1, L2, L3, L4 = L[0], L[0] + L[1], L[0] + L[1] + L[2], sum(L)
        zmin = min(c["zMin"], cr["zMax"])
        etc_s = eta_s = 0.0
        aw = st[0] + st[1]
        for t in range(L4):
            d = sow + t
            if t < L1: kc = cr["kcIni"]
            elif t < L2: kc = cr["kcIni"] + (cr["kcMid"] - cr["kcIni"]) * (t - L1 + 1) / (L2 - L1)
            elif t < L3: kc = cr["kcMid"]
            else: kc = cr["kcMid"] + (cr["kcEnd"] - cr["kcMid"]) * (t - L3 + 1) / (L4 - L3)
            zr = zmin + (cr["zMax"] - zmin) * min(1.0, (t + 1) / L2)
            st = move(st, zr)
            tw = taw(zr); etc = kc * et0[d]
            p = min(0.8, max(0.1, cr["pTab"] + 0.04 * (5 - etc)))
            dr = max(0.0, tw - st[0])
            ks = 1.0 if dr <= p * tw else (tw - dr) / ((1 - p) * tw)
            eta = max(0.0, ks) * etc
            r = ro(pr[d], c["cnSmallGrain"])
            st[0] += pr[d] - r - eta
            if st[0] < 0:
                eta += st[0]; st[0] = 0.0
            if st[0] > tw:
                st[1] += st[0] - tw; st[0] = tw
                if st[1] > tawcol - tw:
                    acc["dp"] += st[1] - (tawcol - tw); st[1] = tawcol - tw
            etc_s += etc; eta_s += eta; acc["ro"] += r; acc["et"] += eta
        st = move(st, zbare)
        return st, {"etc": etc_s, "eta": eta_s, "aw": aw}

    def window(w, st, cursor):
        acc = {"dp": 0.0, "ro": 0.0, "et": 0.0}
        s0 = st[0] + st[1]
        seas = []
        for sl in w["slots"]:
            if sl is None:
                seas.append(None); continue
            sow = max(idx(sl["sowDate"]), cursor)
            if sow > cursor: st = bare(st, cursor, sow, acc)
            st, o = season(st, sow, sl["stages"], acc)
            seas.append(o)
            cursor = sow + sum(sl["stages"])
        end = max(cursor, idx(w["coreEndDate"]))
        if cursor < end: st = bare(st, cursor, end, acc)
        return st, end, seas, s0, acc

    print()
    print("=== Part B: repeating cycle wheat -> fallow -> wheat, rainfed, layered profile ===")
    print("AY1   start    S0 py/eng (mm)     ETa yr1 py/eng     ETa yr3 py/eng    deep perc py/eng")
    st, end = None, None
    worst = {"s0": 0.0, "eta": 0.0}
    for w in eng["chain"]:
        start = idx(w["startDate"])
        if st is None or end is None or end < start:
            wv = w["w0"]
            st = [wv * taw(zbare), wv * (tawcol - taw(zbare)), zbare]
            cur = start
            prev = None
            for _ in range(6):  # periodic steady state
                st2, e2, *_ = window(w, list(st), cur)
                if prev is not None and abs((st2[0] + st2[1]) - prev) < 0.5:
                    break
                prev = st2[0] + st2[1]
                st, cur = st2, start + max(0, e2 - idx(w["coreEndDate"]))
            st_new, end, seas, s0, acc = window(w, list(st), cur)
        else:
            st_new, end, seas, s0, acc = window(w, list(st), end)
        st = st_new
        e = w["seasons"]
        print("%d  %-7s  %7.1f / %7.1f   %6.1f / %6.1f   %6.1f / %6.1f   %6.1f / %6.1f"
              % (w["firstAy"], w["start"], s0, w["storageStart"], seas[0]["eta"], e[0]["eta"], seas[2]["eta"], e[2]["eta"], acc["dp"], w["deepPerc"]))
        worst["s0"] = max(worst["s0"], abs(s0 - w["storageStart"]))
        worst["eta"] = max(worst["eta"], abs(seas[0]["eta"] - e[0]["eta"]), abs(seas[2]["eta"] - e[2]["eta"]))
    print("max |dS0| %.2f mm   max |dETa| %.2f mm" % (worst["s0"], worst["eta"]))


if __name__ == "__main__":
    run()
