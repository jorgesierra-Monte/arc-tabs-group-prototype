// Arc Tab Group prototype — three independent groups (A: text hover, B: surface hover, C: inverse selected)

const TABS = [
  { id: "today",   label: "Today",   count: 4,  blurb: "Sessions and tasks scheduled for today." },
  { id: "notes",   label: "Notes",   count: 12, blurb: "Progress notes waiting for your signature." },
  { id: "forms",   label: "Forms",   count: 3,  blurb: "Intake forms and assessments from clients." },
  { id: "files",   label: "Files",   count: 2,  blurb: "Documents shared with clients." },
];
const DISABLED_ID = "files";


const settings = { divider: true, disabledTab: true, hoverLine: false };

function buildTab(tab, type, { selected, disabled, cls, interactive, groupId }) {
  const el = document.createElement(interactive ? "button" : "div");
  el.className = "tab" + (cls ? ` ${cls}` : "");
  el.setAttribute("aria-selected", String(selected));
  if (disabled) el.setAttribute("aria-disabled", "true");

  if (interactive) {
    el.type = "button";
    el.role = "tab";
    el.id = `${groupId}-tab-${tab.id}`;
    el.dataset.id = tab.id;
    el.tabIndex = selected ? 0 : -1;
    el.setAttribute("aria-controls", `${groupId}-panel`);
  }

  const content = document.createElement("span");
  content.className = "tab-content" + (type === "icon" ? " has-icon" : "") + (type === "count" ? " has-count" : "");

  if (type === "icon") {
    const icon = document.createElement("span");
    icon.className = "tab-icon";
    icon.setAttribute("aria-hidden", "true");
    content.append(icon);
  }

  const label = document.createElement("span");
  label.className = "tab-label txt-label";
  label.dataset.text = tab.label;
  label.textContent = tab.label;
  content.append(label);

  if (type === "count") {
    const tag = document.createElement("span");
    tag.className = "tag txt-eyebrow";
    tag.textContent = tab.count;
    tag.setAttribute("aria-label", `${tab.count} items`);
    content.append(tag);
  }

  const indicator = document.createElement("span");
  indicator.className = "tab-indicator";
  indicator.setAttribute("aria-hidden", "true");

  // Faint line that previews the underline on hover (Direction A option)
  const hoverLine = document.createElement("span");
  hoverLine.className = "tab-hover-line";
  hoverLine.setAttribute("aria-hidden", "true");

  el.append(content, indicator, hoverLine);
  return el;
}

class TabGroup {
  constructor(section) {
    this.section = section;
    this.key = section.dataset.direction;
    this.groupId = `group-${this.key}`;
    this.type = "default";
    this.selectedId = "notes";
    this.motion = { mode: "slide", easingId: "standard", duration: 250 };

    this.mount = section.querySelector("[data-tab-group]");
    this.panel = section.querySelector("[data-tab-panel]");
    this.panel.id = `${this.groupId}-panel`;

    this.mount.classList.add(`dir-${this.key}`);
    this.render();

    // Keep the sliding bar glued to its tab when fonts load or the layout reflows
    const relayout = () => { this.placeSlider(false); this.placeInvert(false); };
    new ResizeObserver(relayout).observe(this.mount);
    document.fonts.ready.then(relayout);
  }

  setMotion(patch) {
    Object.assign(this.motion, patch);
    this.applyMotion();
  }

  applyMotion() {
    const { mode, easingId, duration } = this.motion;
    const easing = EASINGS.find((e) => e.id === easingId);
    const list = this.list;
    list.classList.add("no-transition");
    // Slide + Stretch share the travelling bar; Grow uses per-tab bars
    list.classList.toggle("motion-slide", mode === "slide" || mode === "stretch");
    list.classList.toggle("motion-stretch", mode === "stretch");
    list.classList.toggle("motion-grow", mode === "grow");
    list.style.setProperty("--motion-dur", `${duration}ms`);
    list.style.setProperty("--motion-ease", easingCSS(easing));
    this.placeSlider(false);
    this.placeInvert(false);
    list.offsetWidth; // flush so the mode switch itself doesn't animate
    list.classList.remove("no-transition");
  }

  // Selected tab's indicator slot, relative to the tablist. Uses layout offsets,
  // not getBoundingClientRect, so a mid-animation transform (Grow) can't skew it.
  slotBox(tabEl) {
    const ind = tabEl.querySelector(".tab-indicator");
    return {
      x: tabEl.offsetLeft + ind.offsetLeft,
      y: tabEl.offsetTop + ind.offsetTop,
      w: ind.offsetWidth,
      h: ind.offsetHeight,
    };
  }

  setSlider({ x, y, w, h }) {
    this.slider.style.width = `${w}px`;
    this.slider.style.height = `${h}px`; // matches the slot's bar thickness
    this.slider.style.transform = `translate(${x}px, ${y}px)`;
    this.setInvertClip({ x, y, w, h }); // inverted labels travel with the bar
  }

  // ---- Inverted labels (C): a white copy of the tabs, clipped to the selected
  // surface, so text is white exactly where the black surface is — mid-slide too.
  syncInvert() {
    if (!this.invert) return;
    const clones = [...this.list.querySelectorAll(":scope > .tab")].map((tab) => {
      const c = tab.cloneNode(true);
      c.removeAttribute("id");
      c.tabIndex = -1;
      return c;
    });
    this.invert.replaceChildren(...clones);
  }

  setInvertClip({ x, y, w, h }) {
    if (!this.invert) return;
    const W = this.list.offsetWidth, H = this.list.offsetHeight;
    this.invert.style.clipPath =
      `inset(${y}px ${W - x - w}px ${H - y - h}px ${x}px round var(--indicator-radius, var(--radius-xsmall)))`;
  }

  placeInvert(animate = true) {
    if (!this.invert) return;
    const mode = this.motion.mode;
    const to = this.slotBox(this.currentTab());
    if ((mode === "slide" || mode === "stretch") && animate) return; // placeSlider drives it
    // Only this layer pauses its transition — pausing the whole list would also
    // cancel the selection animation that starts in the same frame.
    const inv = this.invert;
    inv.classList.add("no-anim");
    if (mode === "grow" && animate) {
      // start collapsed at the tab's centre, then open with the growing surface
      this.setInvertClip({ x: to.x + to.w / 2, y: to.y, w: 0, h: to.h });
      inv.offsetWidth;
      inv.classList.remove("no-anim");
      this.setInvertClip(to);
      return;
    }
    this.setInvertClip(to);
    inv.offsetWidth;
    inv.classList.remove("no-anim");
  }


  // Move the shared bar onto the selected tab's own indicator slot
  placeSlider(animate = true, fromTab = null) {
    const mode = this.motion.mode;
    if (!this.list || (mode !== "slide" && mode !== "stretch")) return;
    const to = this.slotBox(this.currentTab());
    cancelAnimationFrame(this.stretchRaf);
    if (animate && mode === "stretch" && fromTab) return this.runStretch(this.slotBox(fromTab), to);
    if (!animate) this.list.classList.add("no-transition");
    this.setSlider(to);
    if (!animate) {
      this.list.offsetWidth;
      this.list.classList.remove("no-transition");
    }
  }

  // Stretch: the leading edge leaves first, the trailing edge follows,
  // so the bar briefly spans both tabs before settling.
  runStretch(from, to) {
    const ease = easingFn(EASINGS.find((e) => e.id === this.motion.easingId));
    const dur = this.motion.duration;
    const lag = 0.06; // trailing edge starts after 6% of the duration
    const maxStretch = 16; // never more than 16px longer than the bar's resting width
    const span = 1 - lag;
    const right = to.x > from.x;
    const fromL = from.x, fromR = from.x + from.w, toL = to.x, toR = to.x + to.w;
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const lead = ease(Math.min(1, t / span));
      const trail = ease(Math.max(0, (t - lag) / span));
      const pL = right ? trail : lead;
      const pR = right ? lead : trail;
      let L = fromL + (toL - fromL) * pL;
      let R = fromR + (toR - fromR) * pR;
      const maxW = Math.max(from.w, to.w) + maxStretch;
      if (right) L = Math.max(L, R - maxW); // pull the trailing edge along
      else R = Math.min(R, L + maxW);
      this.setSlider({ x: Math.min(L, R), y: to.y, w: Math.abs(R - L), h: to.h });
      if (t < 1) this.stretchRaf = requestAnimationFrame(frame);
    };
    this.stretchRaf = requestAnimationFrame(frame);
  }

  isDisabled(id) {
    return settings.disabledTab && id === DISABLED_ID;
  }

  setType(type) {
    this.type = type;
    this.render();
  }

  render() {
    const hadFocus = this.mount.contains(document.activeElement);
    if (this.isDisabled(this.selectedId)) this.selectedId = TABS[0].id;

    const list = document.createElement("div");
    list.className = "tablist" + (settings.divider ? " has-divider" : "") +
      (settings.hoverLine && this.key === "a" ? " hover-line" : ""); // A only
    list.role = "tablist";
    list.setAttribute("aria-label", `Direction ${this.key.toUpperCase()} tabs`);

    for (const tab of TABS) {
      list.append(buildTab(tab, this.type, {
        selected: tab.id === this.selectedId,
        disabled: this.isDisabled(tab.id),
        interactive: true,
        groupId: this.groupId,
      }));
    }

    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn || btn.getAttribute("aria-disabled") === "true") return;
      this.select(btn.dataset.id);
    });
    list.addEventListener("keydown", (e) => this.onKeydown(e));

    const slider = document.createElement("span");
    slider.className = "tab-slider";
    slider.setAttribute("aria-hidden", "true");
    list.append(slider);

    // C inverts the selected label onto a black surface
    this.invert = null;
    if (this.key === "c") {
      this.invert = document.createElement("div");
      this.invert.className = "tab-invert";
      this.invert.setAttribute("aria-hidden", "true");
      this.invert.inert = true;
      list.append(this.invert);
    }

    this.mount.replaceChildren(list);
    this.list = list;
    this.slider = slider;
    this.syncInvert();
    this.applyMotion();
    this.updatePanel();
    if (hadFocus) this.currentTab().focus();

  }

  currentTab() {
    return this.list.querySelector(`[data-id="${this.selectedId}"]`);
  }

  select(id, { focus = false } = {}) {
    if (id === this.selectedId) {
      if (focus) this.currentTab().focus();
      return;
    }
    const prev = this.currentTab();
    prev.setAttribute("aria-selected", "false");
    prev.tabIndex = -1;

    this.selectedId = id;
    const next = this.currentTab();
    next.setAttribute("aria-selected", "true");
    next.tabIndex = 0;
    if (focus) next.focus();
    this.syncInvert();
    this.placeSlider(true, prev);
    this.placeInvert(true);
    this.updatePanel();
  }

  selectNext() {
    const enabled = TABS.filter((t) => !this.isDisabled(t.id));
    const i = enabled.findIndex((t) => t.id === this.selectedId);
    this.select(enabled[(i + 1) % enabled.length].id);
  }

  onKeydown(e) {
    const enabled = TABS.filter((t) => !this.isDisabled(t.id));
    const i = enabled.findIndex((t) => t.id === this.selectedId);
    let target;
    switch (e.key) {
      case "ArrowRight": target = enabled[(i + 1) % enabled.length]; break;
      case "ArrowLeft":  target = enabled[(i - 1 + enabled.length) % enabled.length]; break;
      case "Home":       target = enabled[0]; break;
      case "End":        target = enabled[enabled.length - 1]; break;
      default: return;
    }
    e.preventDefault();
    this.select(target.id, { focus: true });
  }

  updatePanel() {
    const tab = TABS.find((t) => t.id === this.selectedId);
    this.panel.setAttribute("aria-labelledby", `${this.groupId}-tab-${tab.id}`);
    this.panel.innerHTML = `<strong>${tab.label}</strong><br>${tab.blurb}`;
  }

}

// ---- Boot ----
const groups = {};
document.querySelectorAll("[data-direction]").forEach((section) => {
  const g = new TabGroup(section);
  groups[g.key] = g;
});

// Tabs type — one control drives all three directions
const typeControl = document.querySelector("[data-type-control]");
const typeButtons = [...typeControl.querySelectorAll("button")];
let currentType = "default";
function setAllTypes(type) {
  currentType = type;
  Object.values(groups).forEach((g) => g.setType(type));
  typeButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === type)));
}
typeButtons.forEach((b) => b.addEventListener("click", () => setAllTypes(b.dataset.value)));
typeControl.addEventListener("keydown", (e) => {
  if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) return;
  e.preventDefault();
  const i = typeButtons.findIndex((b) => b.dataset.value === currentType);
  const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : typeButtons.length - 1;
  const next = typeButtons[(i + step) % typeButtons.length];
  next.click();
  next.focus();
});
setAllTypes("default");

// Global toggles (apply to all groups)
document.querySelector('[data-toggle="divider"]').addEventListener("change", (e) => {
  settings.divider = e.target.checked;
  Object.values(groups).forEach((g) => g.render());
});
document.querySelector('[data-toggle="hoverLine"]').addEventListener("change", (e) => {
  settings.hoverLine = e.target.checked;
  groups.a.render();
});
document.querySelector('[data-toggle="disabled"]').addEventListener("change", (e) => {
  settings.disabledTab = e.target.checked;
  Object.values(groups).forEach((g) => g.render());
});

// Number keys 1–3 switch the tabs type for all directions
const TYPE_KEYS = ["default", "count", "icon"];
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === "INPUT") return;
  const n = Number(e.code.replace("Digit", ""));
  if (n >= 1 && n <= 3) setAllTypes(TYPE_KEYS[n - 1]);
});

// ============================================================
// Motion controls
// ============================================================
const SVG_NS = "http://www.w3.org/2000/svg";
const motionUI = {
  target: "all",
  get groups() { return this.target === "all" ? Object.values(groups) : [groups[this.target]]; },
  // Values shown in the UI come from the first targeted group
  get current() { return this.groups[0].motion; },
};

function wireSegmented(control, getValue, setValue) {
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
    // Picking a curve also applies its recommended duration (still adjustable)
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

const durationInput = document.querySelector("[data-duration]");
const durationOut = document.querySelector("[data-duration-value]");
durationInput.addEventListener("input", () => {
  setMotion({ duration: Number(durationInput.value) });
  syncMotionUI();
});
durationInput.addEventListener("change", () => replay());

document.querySelector("[data-replay]").addEventListener("click", replay);

function syncMotionUI() {
  const m = motionUI.current;
  const e = currentEasing();
  syncTarget();
  syncMode();
  durationInput.value = m.duration;
  durationOut.textContent = `${m.duration}ms`;
  document.querySelector("[data-trigger-name]").textContent = e.name;
  curveSVG(document.querySelector("[data-trigger-thumb]"), e, 24, 20);
  optionEls.forEach(({ btn }, id) => btn.setAttribute("aria-checked", String(id === m.easingId)));
  document.querySelector("[data-preview-value]").textContent = easingCSS(e);
  document.querySelector("[data-preview-value]").title = easingCSS(e);
  // Easing/duration don't matter with no animation
  trigger.disabled = durationInput.disabled = m.mode === "none";
  trigger.style.opacity = durationInput.parentElement.style.opacity = m.mode === "none" ? 0.4 : "";
}
syncMotionUI();

// R replays (outside text inputs)
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey && e.target.tagName !== "INPUT") replay();
});
