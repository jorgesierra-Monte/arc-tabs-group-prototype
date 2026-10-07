// Common easing curves + helpers for evaluating and drawing them.
// Bezier curves map straight to CSS cubic-bezier(); springs are sampled into CSS linear().

const EASINGS = (() => {
  const b = (id, name, group, p) => ({ id, name, group, kind: "bezier", p });
  const s = (id, name, group, stiffness, damping) => ({ id, name, group, kind: "spring", stiffness, damping });
  return [
    b("linear",          "Linear",          "CSS keywords", [0, 0, 1, 1]),
    b("ease",            "Ease",            "CSS keywords", [0.25, 0.1, 0.25, 1]),
    b("ease-in",         "Ease in",         "CSS keywords", [0.42, 0, 1, 1]),
    b("ease-out",        "Ease out",        "CSS keywords", [0, 0, 0.58, 1]),
    b("ease-in-out",     "Ease in-out",     "CSS keywords", [0.42, 0, 0.58, 1]),

    b("out-quad",        "Out Quad",        "Ease out", [0.25, 0.46, 0.45, 0.94]),
    b("out-cubic",       "Out Cubic",       "Ease out", [0.215, 0.61, 0.355, 1]),
    b("out-quart",       "Out Quart",       "Ease out", [0.165, 0.84, 0.44, 1]),
    b("out-quint",       "Out Quint",       "Ease out", [0.23, 1, 0.32, 1]),
    b("out-expo",        "Out Expo",        "Ease out", [0.19, 1, 0.22, 1]),
    b("out-circ",        "Out Circ",        "Ease out", [0.075, 0.82, 0.165, 1]),

    b("in-out-quad",     "In-out Quad",     "Ease in-out", [0.455, 0.03, 0.515, 0.955]),
    b("in-out-cubic",    "In-out Cubic",    "Ease in-out", [0.645, 0.045, 0.355, 1]),
    b("in-out-quart",    "In-out Quart",    "Ease in-out", [0.77, 0, 0.175, 1]),
    b("in-out-quint",    "In-out Quint",    "Ease in-out", [0.86, 0, 0.07, 1]),
    b("in-out-expo",     "In-out Expo",     "Ease in-out", [1, 0, 0, 1]),
    b("in-out-circ",     "In-out Circ",     "Ease in-out", [0.785, 0.135, 0.15, 0.86]),

    b("out-back",        "Out Back",        "Expressive", [0.175, 0.885, 0.32, 1.275]),
    b("in-out-back",     "In-out Back",     "Expressive", [0.68, -0.55, 0.265, 1.55]),
    s("spring-gentle",   "Spring gentle",   "Expressive", 170, 26),
    s("spring-snappy",   "Spring snappy",   "Expressive", 300, 24),
    s("spring-bouncy",   "Spring bouncy",   "Expressive", 220, 14),

    b("md-standard",     "Material standard",   "System", [0.2, 0, 0, 1]),
    b("md-emphasized",   "Material emphasized", "System", [0.05, 0.7, 0.1, 1]),
    b("ios",             "iOS default",         "System", [0.25, 0.1, 0.25, 1]),
    b("arc-entrance",    "Arc entrance",        "System", [0, 0, 0.38, 0.9]),
  ];
})();

// ---- Evaluation ----
function bezierFn([x1, y1, x2, y2]) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dsx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
}

// Damped spring (mass 1) from 0 → 1, normalised so it settles at t = 1
function springSamples(stiffness, damping, n = 60) {
  const dt = 1 / 600;
  let x = 0, v = 0, t = 0;
  const pts = [];
  let settledAt = null;
  while (t < 4) {
    const a = stiffness * (1 - x) - damping * v;
    v += a * dt; x += v * dt; t += dt;
    pts.push([t, x]);
    if (Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.01) {
      if (settledAt === null) settledAt = t;
    } else settledAt = null;
    if (settledAt !== null && t - settledAt > 0.05) break;
  }
  const total = t;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * total;
    const p = pts.find((q) => q[0] >= target) || pts[pts.length - 1];
    out.push(i === n ? 1 : p[1]);
  }
  return out; // y values at evenly spaced x
}

function easingFn(e) {
  if (e.kind === "bezier") return bezierFn(e.p);
  const ys = e._ys || (e._ys = springSamples(e.stiffness, e.damping));
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const f = x * (ys.length - 1), i = Math.floor(f);
    return ys[i] + (ys[i + 1] - ys[i]) * (f - i);
  };
}

function easingCSS(e) {
  if (e.kind === "bezier") return `cubic-bezier(${e.p.join(", ")})`;
  const ys = e._ys || (e._ys = springSamples(e.stiffness, e.damping));
  return `linear(${ys.map((y) => +y.toFixed(4)).join(", ")})`;
}

// ---- Drawing ----
// Path for a curve inside a w×h box, with y padded so overshoot stays visible
function easingPath(e, w, h, pad = 0.2) {
  const span = 1 + pad * 2;
  const X = (x) => x * w;
  const Y = (y) => h - ((y + pad) / span) * h;
  if (e.kind === "bezier") {
    const [x1, y1, x2, y2] = e.p;
    return `M${X(0)},${Y(0)} C${X(x1)},${Y(y1)} ${X(x2)},${Y(y2)} ${X(1)},${Y(1)}`;
  }
  const f = easingFn(e);
  let d = "";
  for (let i = 0; i <= 48; i++) {
    const x = i / 48;
    d += (i ? "L" : "M") + X(x).toFixed(2) + "," + Y(f(x)).toFixed(2);
  }
  return d;
}
