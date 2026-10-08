// Common easing curves + helpers for evaluating and drawing them.
// Bezier curves map straight to CSS cubic-bezier(); springs are sampled into CSS linear().

// Three curves, subtle → expressive, based on what common tab components ship with.
// `duration` is the recommended default for each; springs use their natural settle time.
const EASINGS = [
  {
    id: "standard", name: "Standard", kind: "bezier", p: [0.4, 0, 0.2, 1], duration: 250,
    desc: "Even ease in and out. The most common tab curve.",
    source: "Material standard · MUI Tabs · Android TabRow",
  },
  {
    id: "decelerate", name: "Decelerate", kind: "bezier", p: [0.1, 0.9, 0.2, 1], duration: 300,
    desc: "Leaves fast, glides into place. Feels responsive.",
    source: "Fluent 2 TabList (curveDecelerateMax)",
  },
  {
    id: "spring", name: "Spring", kind: "spring", stiffness: 380, damping: 30,
    desc: "Physics-based, settles with a hint of overshoot.",
    source: "Framer Motion layoutId tabs (Vercel-style)",
  },
];

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
    if (Math.abs(1 - x) < 0.004 && Math.abs(v) < 0.05) {
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
  out.settle = total; // seconds until the spring comes to rest
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

// Recommended duration in ms (springs: natural settle time, rounded to 25ms)
function easingDuration(e) {
  if (e.kind === "bezier") return e.duration;
  const ys = e._ys || (e._ys = springSamples(e.stiffness, e.damping));
  return Math.round((ys.settle * 1000) / 25) * 25;
}
