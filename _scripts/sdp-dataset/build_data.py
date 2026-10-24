"""Extract the data behind the figures of the sdp-dataset blog post.

Reads the solver comparison and instance overview reports generated in a
MathOptDataset checkout and writes assets/data/sdp-dataset.json, which
assets/js/sdp-dataset.js draws.

Usage, from the site root:
    python3 -I _scripts/sdp-dataset/build_data.py [MATHOPTDATASET_DIR]

MATHOPTDATASET_DIR defaults to ~/src/MathOptDataset; the reports are
reports/sdp_solver_report.html and reports/sdp_overview.html there.
"""
import base64
import gzip
import json
import re
import sys
from collections import Counter
from pathlib import Path

repo = Path(sys.argv[1] if len(sys.argv) > 1 else "~/src/MathOptDataset").expanduser()
out_path = Path(__file__).resolve().parents[2] / "assets" / "data" / "sdp-dataset.json"


def embedded_json(html, pattern):
    """The JSON payload a report embeds in a <script> tag, gzip-base64 encoded or plain."""
    m = re.search(pattern, html, re.S)
    if not m:
        sys.exit(f"no embedded data matching {pattern!r}")
    enc, text = m.group("enc") or "json", m.group("data").strip()
    return json.loads(text if enc == "json" else gzip.decompress(base64.b64decode(text)))


D = embedded_json((repo / "reports" / "sdp_solver_report.html").read_text(),
                  r'<script id="data" type="application/json"(?P<enc>)>(?P<data>.*?)</script>')
O = embedded_json((repo / "reports" / "sdp_overview.html").read_text(),
                  r'<script type="application/json" id="payload" data-enc="(?P<enc>[\w-]*)">(?P<data>.*?)</script>')

L, S, I = D["labels"], D["summary"], D["instances"]
N = len(I["id"])
R = {l: I["results"][l] for l in L}
stale = {l: set(R[l]["stale"]) for l in L}


def r6(x):
    return None if x is None else float(f"{x:.4g}")


def r3(x):
    # Curve values are shares, shown to 0.1% in the tooltips.
    return None if x is None else round(x, 3)


# ---- how many solvers solve each instance (same logic as the report) ----
common = [row for row in range(N) if all(R[l]["group"][row] is not None and row not in stale[l] for l in L)]
timed = lambda k, row: (I["timed"][row] >> k) & 1
sizes = sorted(I["size"][row] for row in common if I["size"][row] is not None)
cut = [sizes[len(sizes) // 3], sizes[2 * len(sizes) // 3]]
unsized = len(sizes) < len(common)
bins = [[0, 0, 0, 0] for _ in range(len(L) + 1)]
for row in common:
    n = sum(timed(k, row) for k in range(len(L)))
    sz = I["size"][row]
    bins[n][3 if sz is None else 0 if sz <= cut[0] else 1 if sz <= cut[1] else 2] += 1
if not unsized:
    bins = [b[:3] for b in bins]

# ---- instance scatter and tags ----
F = {f: i for i, f in enumerate(O["fields"])}
cols = O["cols"]
tag_count = Counter(O["tags"][t] for ts in cols[F["tags"]] for t in ts)
SKIP_TAGS = {"semidefinite", "continuous", "sdp"}
tags = [[t, n] for t, n in tag_count.most_common() if t not in SKIP_TAGS][:110]
# Instances with identical sizes and sense are drawn as one mark, with the
# number of instances it stands for.
points = Counter(sorted(zip(cols[F["nvar"]], cols[F["ncon"]], cols[F["sense"]])))

out = {
    "generated": D["generated"],
    "solvers": L,
    "instances": N,
    "tolerance": max(D["tolerances"]["absolute"], D["tolerances"]["relative"]),
    "min_time": D["min_time"],
    "scope": D["scope"],
    "solved_count": {"common": len(common), "cut": cut, "unsized": unsized, "bins": bins},
    "checked_error": {"grid": D["grids"]["error"],
                      "curves": [[r3(v) for v in s["checked_error_curve"]] for s in S],
                      "counts": [s["checked_error_count"] for s in S]},
    "profile": {"grid": [r6(v) for v in D["grids"]["tau"]], "curves": [[r3(v) for v in s["profile"]] for s in S]},
    "consensus": {"instances": D["consensus"]["instances"], "rows": [s["consensus"] for s in S]},
    "ranks": [s["ranks"] for s in S],
    "pairs": [{k: p[k] for k in ("a", "b", "both_timed", "time_ratio", "only_a", "only_b")} for p in D["pairs"]],
    "tags": tags,
    "tags_total": len(tag_count),
    "senses": O["senses"],
    "scatter": {
        "nvar": [k[0] for k in points],
        "ncon": [k[1] for k in points],
        "sense": [k[2] for k in points],
        "count": list(points.values()),
    },
}
out_path.write_text(json.dumps(out, separators=(",", ":")))
print(f"wrote {out_path} ({out_path.stat().st_size:,} bytes)")
