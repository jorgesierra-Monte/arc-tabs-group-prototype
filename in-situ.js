// In situ pages — the final tab group (B · Surface hover, Slide, Decelerate).
// A/C, other motions and easings stay reachable under "Older explorations".
// Tabs come from the page: every [data-view] panel (data-label = tab label, in
// tab order via data-order or DOM order); the visible panel starts selected.

const views = [...document.querySelectorAll("[data-view]")];
const ORDER = (document.querySelector("[data-tab-order]")?.dataset.tabOrder || "").split(",").filter(Boolean);
const tabs = (ORDER.length ? ORDER : views.map((v) => v.dataset.view)).map((id) => {
  const v = views.find((x) => x.dataset.view === id);
  return { id, label: v.dataset.label };
});

function showView(tab, group) {
  for (const v of views) {
    const on = v.dataset.view === tab.id;
    v.hidden = !on;
    if (on) v.setAttribute("aria-labelledby", `${group.groupId}-tab-${tab.id}`);
  }
}

const FINAL = { direction: "b", mode: "slide", easingId: "decelerate" };
const NAMES = { a: "A · Text hover", b: "B · Surface hover", c: "C · Inverse selected" };

const mount = document.querySelector("[data-insitu-tabs]");
const groups = {
  main: new TabGroup(mount, {
    direction: FINAL.direction,
    id: "insitu",
    tabs,
    selectedId: views.find((v) => !v.hidden).dataset.view,
    disabledId: null,
    label: mount.dataset.label || "Sections",
    onSelect: showView,
  }),
};

// Direction switch (A / B / C)
const dirControl = document.querySelector("[data-direction-control]");
const dirButtons = [...dirControl.querySelectorAll("button")];
function setDirection(key) {
  groups.main.setDirection(key);
  dirButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === key)));
  updateSummary();
}

// Summary in the bottom-left panel: the final spec, or what's being explored
const summary = document.querySelector("[data-summary]");
function updateSummary() {
  if (!summary) return;
  const g = groups.main;
  const m = g.motion;
  const easing = EASINGS.find((e) => e.id === m.easingId);
  const motion = m.mode === "none" ? "No motion" : `${m.mode[0].toUpperCase()}${m.mode.slice(1)} · ${easing.name}`;
  const isFinal = g.key === FINAL.direction && m.mode === FINAL.mode && m.easingId === FINAL.easingId;
  summary.innerHTML = `<span class="final-badge${isFinal ? "" : " is-exploring"}">${isFinal ? "Final" : "Exploring"}</span>${NAMES[g.key]} · ${motion}`;
}
document.addEventListener("motionchange", updateSummary);

// Back to the chosen spec
document.querySelector("[data-reset-final]")?.addEventListener("click", () => {
  setDirection(FINAL.direction);
  const easing = EASINGS.find((e) => e.id === FINAL.easingId);
  groups.main.setMotion({ mode: FINAL.mode, easingId: FINAL.easingId, duration: easingDuration(easing) });
  syncMotionUI(); // from motion.js
});
dirButtons.forEach((b) => b.addEventListener("click", () => setDirection(b.dataset.value)));
dirControl.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  const i = dirButtons.findIndex((b) => b.getAttribute("aria-checked") === "true");
  const next = dirButtons[(i + (e.key === "ArrowRight" ? 1 : dirButtons.length - 1)) % dirButtons.length];
  next.click();
  next.focus();
});
setDirection(FINAL.direction);

// Divider under the tabs
document.querySelector('[data-toggle="divider"]')?.addEventListener("change", (e) => {
  settings.divider = e.target.checked;
  groups.main.render();
});

// Keys 1–3 switch direction
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === "INPUT") return;
  const key = { Digit1: "a", Digit2: "b", Digit3: "c" }[e.code];
  if (key) setDirection(key);
});

// Fixed-size artboards (e.g. the 1440×940 session screen) scale to fit above the controls
const artboard = document.querySelector("[data-artboard]");
if (artboard) {
  const W = +artboard.dataset.width, H = +artboard.dataset.height;
  const fit = () => {
    const controls = document.querySelector(".controls").getBoundingClientRect().height + 40;
    const s = Math.min(1, (innerWidth - 32) / W, (innerHeight - controls - 24) / H);
    artboard.style.transform = `scale(${s})`;
    artboard.parentElement.style.height = `${H * s}px`;
    artboard.parentElement.style.width = `${W * s}px`;
  };
  addEventListener("resize", fit);
  fit();
}
