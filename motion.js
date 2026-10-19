// Motion controls — shared by every page. Expects a global `groups` object.
const SVG_NS = "http://www.w3.org/2000/svg";
const motionUI = {
  target: "all",
  get groups() { return this.target === "all" ? Object.values(groups) : [groups[this.target]]; },
  // Values shown in the UI come from the first targeted group
  get current() { return this.groups[0].motion; },
};

function wireSegmented(control, getValue, setValue) {
  if (!control) return () => {}; // control not on this page
  const buttons = [...control.querySelectorAll("button")];
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === getValue())));
  buttons.forEach((b) => b.addEventListener("click", () => { setValue(b.dataset.value); syncMotionUI(); }));
  control.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = buttons.findIndex((b) => b.dataset.value === getValue());
    const next = buttons[(i + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
    next.click();
    next.focus();
  });
  return sync;
}

function setMotion(patch) {
  motionUI.groups.forEach((g) => g.setMotion(patch));
}

function replay() {
  motionUI.groups.forEach((g) => g.selectNext());
}

function curveSVG(svg, easing, w, h, { strokeWidth = 1.5, grid = false } = {}) {
  svg.replaceChildren();
  const pad = 0.2;
  const Y = (y) => h - ((y + pad) / (1 + pad * 2)) * h;
  if (grid) {
    for (const y of [0, 1]) {
      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", 0); line.setAttribute("x2", w);
      line.setAttribute("y1", Y(y)); line.setAttribute("y2", Y(y));
      line.setAttribute("stroke", "var(--hairline-soft)");
      line.setAttribute("stroke-dasharray", "3 3");
      svg.append(line);
    }
  }
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", easingPath(easing, w, h, pad));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", strokeWidth);
  path.setAttribute("stroke-linecap", "round");
  svg.append(path);
  return { Y };
}

// ---- Easing popover: three curves, subtle → expressive ----
const popover = document.getElementById("easing-popover");
const trigger = document.querySelector("[data-easing-trigger]");
const listEl = document.querySelector("[data-easing-list]");
const optionEls = new Map();
const GRAPH_W = 144, GRAPH_H = 88;

for (const e of EASINGS) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "easing-option";
  btn.role = "radio";
  btn.dataset.id = e.id;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "easing-card-graph");
  svg.setAttribute("viewBox", `0 0 ${GRAPH_W} ${GRAPH_H}`);
  svg.setAttribute("aria-hidden", "true");
  const { Y } = curveSVG(svg, e, GRAPH_W, GRAPH_H, { strokeWidth: 2, grid: true });
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", 4);
  dot.setAttribute("fill", "var(--text-default)");
  dot.setAttribute("cx", GRAPH_W);
  dot.setAttribute("cy", Y(1));
  svg.append(dot);

  const name = document.createElement("span");
  name.className = "easing-card-name";
  name.textContent = e.name;
  const meta = document.createElement("span");
  meta.className = "easing-card-meta";
  meta.textContent = `${easingDuration(e)}ms`;
  const desc = document.createElement("span");
  desc.className = "easing-card-desc";
  desc.textContent = e.desc;
  const source = document.createElement("span");
  source.className = "easing-card-source";
  source.textContent = e.source;

  const head = document.createElement("span");
  head.className = "easing-card-head";
  head.append(name, meta);
  btn.append(svg, head, desc, source);

  btn.addEventListener("click", () => {
    // Each curve carries its own duration
    setMotion({ easingId: e.id, duration: easingDuration(e) });
    syncMotionUI();
    replay();
    playCard(e.id);
  });
  btn.addEventListener("mouseenter", () => playCard(e.id));
  btn.addEventListener("focus", () => playCard(e.id));
  listEl.append(btn);
  optionEls.set(e.id, { btn, dot, Y, easing: e });
}

// Animate the dot along a card's curve; the selected card loops while open
const cardRaf = new Map();
function playCard(id, loop = false) {
  const card = optionEls.get(id);
  cancelAnimationFrame(cardRaf.get(id));
  clearTimeout(cardRaf.get(id));
  const f = easingFn(card.easing);
  const dur = id === motionUI.current.easingId ? motionUI.current.duration : easingDuration(card.easing);
  const start = performance.now();
  const frame = (now) => {
    const x = Math.min(1, (now - start) / dur);
    card.dot.setAttribute("cx", x * GRAPH_W);
    card.dot.setAttribute("cy", card.Y(f(x)));
    if (x < 1) cardRaf.set(id, requestAnimationFrame(frame));
    else if (loop && !popover.hidden && id === motionUI.current.easingId) {
      cardRaf.set(id, setTimeout(() => playCard(id, true), 700));
    }
  };
  cardRaf.set(id, requestAnimationFrame(frame));
}

function currentEasing() {
  return EASINGS.find((e) => e.id === motionUI.current.easingId);
}

function setPopover(open) {
  popover.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  if (open) {
    playCard(motionUI.current.easingId, true);
    optionEls.get(motionUI.current.easingId).btn.focus({ preventScroll: true });
  }
}
trigger.addEventListener("click", () => setPopover(popover.hidden));
document.addEventListener("pointerdown", (e) => {
  if (!popover.hidden && !popover.contains(e.target) && !trigger.contains(e.target)) setPopover(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !popover.hidden) { setPopover(false); trigger.focus(); }
});
listEl.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  const i = EASINGS.findIndex((x) => x.id === motionUI.current.easingId);
  const next = EASINGS[(i + (e.key === "ArrowRight" ? 1 : EASINGS.length - 1)) % EASINGS.length];
  optionEls.get(next.id).btn.click();
  optionEls.get(next.id).btn.focus();
});
document.querySelector("[data-copy]").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(easingCSS(currentEasing()));
    e.target.textContent = "Copied";
  } catch { e.target.textContent = "Select ↑"; }
  setTimeout(() => (e.target.textContent = "Copy"), 1200);
});

// ---- Bar controls ----
const syncTarget = wireSegmented(document.querySelector("[data-motion-target]"), () => motionUI.target, (v) => { motionUI.target = v; });
const syncMode = wireSegmented(document.querySelector("[data-motion-mode]"), () => motionUI.current.mode, (v) => setMotion({ mode: v }));

document.querySelector("[data-replay]").addEventListener("click", replay);

function syncMotionUI() {
  const m = motionUI.current;
  const e = currentEasing();
  syncTarget();
  syncMode();
  const triggerName = document.querySelector("[data-trigger-name]");
  if (triggerName) triggerName.textContent = e.name;
  const triggerThumb = document.querySelector("[data-trigger-thumb]");
  if (triggerThumb) curveSVG(triggerThumb, e, 24, 20);
  optionEls.forEach(({ btn }, id) => btn.setAttribute("aria-checked", String(id === m.easingId)));
  document.querySelector("[data-preview-value]").textContent = easingCSS(e);
  document.querySelector("[data-preview-value]").title = easingCSS(e);
  // Easing doesn't matter with no animation
  if (trigger.dataset.easingTrigger === "panel") {
    listEl.classList.toggle("is-off", m.mode === "none"); // trigger opens a wider panel; keep it usable
  } else {
    trigger.disabled = m.mode === "none";
    trigger.style.opacity = m.mode === "none" ? 0.4 : "";
  }
  document.dispatchEvent(new CustomEvent("motionchange", { detail: m }));
}
syncMotionUI();

// R replays (outside text inputs)
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey && e.target.tagName !== "INPUT") replay();
});
