"""Extract the data behind the figures of the agent-solvers blog post.

Reads the "Agent-Built LP Solvers" report (the HTML page published at
https://claude.ai/artifact/D94GUYghWNS7djjDxpG7KJ, generated from an
lp_benchmark checkout) and writes assets/data/lp-solvers.json, which
assets/js/lp-solvers.js draws.

Usage, from the site root:
    python3 -I _scripts/lp-solvers/build_data.py REPORT_HTML
"""
import json
import re
import sys
from pathlib import Path

if len(sys.argv) != 2:
    sys.exit(__doc__)
html = Path(sys.argv[1]).expanduser().read_text()
out_path = Path(__file__).resolve().parents[2] / "assets" / "data" / "lp-solvers.json"


def embedded_const(name):
    """The JSON object a report assigns to `const NAME = {...};` on a line of its own."""
    m = re.search(rf"^const {name} = (\{{.*\}});$", html, re.M)
    if not m:
        sys.exit(f"no `const {name}` in the report")
    return json.loads(m.group(1))


D, SUM = embedded_const("DATA"), embedded_const("SUM")


def result(r):
    # Raw times of unverified answers are not drawn.
    return {"t": r["t"], "status": r["status"]}


def results(recs):
    return {inst: result(r) for inst, r in recs.items()}


families = {
    fam: {
        **{k: f[k] for k in ("dev", "heldout", "ood", "target")},
        "solvers": {key: {"kind": s["kind"], **{split: results(s.get(split, {})) for split in ("dev", "heldout", "ood")}}
                    for key, s in f["solvers"].items()},
    }
    for fam, f in D["families"].items()
}
TIMELINE = ("id", "min", "score", "solved", "eligible", "note", "out", "inp", "cache", "cw", "total")
runs = {
    key: {"selected": r["selected"], "dev_wall": r["dev_wall"], "usage": r["usage"],
          "timeline": [{k: e.get(k) for k in TIMELINE} for e in r["timeline"]]}
    for key, r in D["runs"].items()
}
cross = {key: results(recs) for key, recs in D["cross"].items()}

out = {"families": families, "runs": runs, "cross": cross, "summaries": SUM}
out_path.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
print(f"wrote {out_path} ({out_path.stat().st_size:,} bytes)")
