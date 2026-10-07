// Arc Tab Group prototype — two independent groups (A: text hover, B: surface hover)

const TABS = [
  { id: "today",   label: "Today",   count: 4,  blurb: "Sessions and tasks scheduled for today." },
  { id: "notes",   label: "Notes",   count: 12, blurb: "Progress notes waiting for your signature." },
  { id: "forms",   label: "Forms",   count: 3,  blurb: "Intake forms and assessments from clients." },
  { id: "billing", label: "Billing", count: 8,  blurb: "Claims, payments, and superbills." },
  { id: "files",   label: "Files",   count: 2,  blurb: "Documents shared with clients." },
];
const DISABLED_ID = "files";

const STATES = [
  { name: "Default",           selected: false, disabled: false },
  { name: "Hover",             selected: false, disabled: false, cls: "is-hover" },
  { name: "Selected",          selected: true,  disabled: false },
  { name: "Hover selected",    selected: true,  disabled: false, cls: "is-hover", only: "b" },
  { name: "Selected disabled", selected: true,  disabled: true },
  { name: "Disabled",          selected: false, disabled: true },
];

const settings = { divider: true, disabledTab: true };

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
  content.className = "tab-content" + (type === "icon" ? " has-icon" : "");

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

  el.append(content, indicator);
  return el;
}

class TabGroup {
  constructor(section) {
    this.section = section;
    this.key = section.dataset.direction;
    this.groupId = `group-${this.key}`;
    this.type = "default";
    this.selectedId = "notes";
    this.motion = { mode: "slide", easingId: "out-cubic", duration: 300 };

    this.mount = section.querySelector("[data-tab-group]");
    this.panel = section.querySelector("[data-tab-panel]");
    this.statesEl = section.querySelector("[data-states]");
    this.panel.id = `${this.groupId}-panel`;

    this.mount.classList.add(`dir-${this.key}`);
    this.statesEl.classList.add(`dir-${this.key}`);
    this.render();

    // Keep the sliding bar glued to its tab when fonts load or the layout reflows
    new ResizeObserver(() => this.placeSlider(false)).observe(this.mount);
    document.fonts.ready.then(() => this.placeSlider(false));
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
    list.classList.toggle("motion-slide", mode === "slide");
    list.classList.toggle("motion-grow", mode === "grow");
    list.style.setProperty("--motion-dur", `${duration}ms`);
    list.style.setProperty("--motion-ease", easingCSS(easing));
    this.placeSlider(false);
    list.offsetWidth; // flush so the mode switch itself doesn't animate
    list.classList.remove("no-transition");
  }

  // Move the shared bar onto the selected tab's own indicator slot
  placeSlider(animate = true) {
    if (!this.list || this.motion.mode !== "slide") return;
    const slot = this.currentTab().querySelector(".tab-indicator");
    const listBox = this.list.getBoundingClientRect();
    const box = slot.getBoundingClientRect();
    if (!animate) this.list.classList.add("no-transition");
    this.slider.style.width = `${box.width}px`;
    this.slider.style.transform = `translate(${box.left - listBox.left}px, ${box.top - listBox.top}px)`;
    if (!animate) {
      this.list.offsetWidth;
      this.list.classList.remove("no-transition");
    }
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
    list.className = "tablist" + (settings.divider ? " has-divider" : "");
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

    this.mount.replaceChildren(list);
    this.list = list;
    this.slider = slider;
    this.applyMotion();
    this.updatePanel();
    if (hadFocus) this.currentTab().focus();

    this.renderStates();
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
    this.placeSlider(true);
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

  renderStates() {
    const sample = { id: "sample", label: "Label", count: 10 };
    const cards = STATES.map((s) => {
      const card = document.createElement("div");
      card.className = "state-card";
      if (s.only && s.only !== this.key) {
        card.classList.add("is-empty");
        const note = document.createElement("span");
        note.className = "state-name";
        note.textContent = `${s.name} isn't defined for this direction`;
        card.append(note);
        return card;
      }
      const specimen = document.createElement("div");
      specimen.className = "state-specimen";
      specimen.append(buildTab(sample, this.type, { ...s, interactive: false }));
      const name = document.createElement("span");
      name.className = "state-name";
      name.textContent = s.name;
      card.append(specimen, name);
      return card;
    });
    this.statesEl.replaceChildren(...cards);
  }
}

// ---- Boot ----
const groups = {};
document.querySelectorAll("[data-direction]").forEach((section) => {
  const g = new TabGroup(section);
  groups[g.key] = g;
});

// Type controls (one per group)
document.querySelectorAll("[data-type-control]").forEach((control) => {
  const group = groups[control.dataset.typeControl];
  const buttons = [...control.querySelectorAll("button")];
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === group.type)));
  buttons.forEach((b) => b.addEventListener("click", () => { group.setType(b.dataset.value); sync(); }));
  control.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = buttons.findIndex((b) => b.dataset.value === group.type);
    const next = buttons[(i + (e.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
    next.click();
    next.focus();
  });
  sync();
});

// Global toggles (apply to both groups)
document.querySelector('[data-toggle="divider"]').addEventListener("change", (e) => {
  settings.divider = e.target.checked;
  Object.values(groups).forEach((g) => g.render());
});
document.querySelector('[data-toggle="disabled"]').addEventListener("change", (e) => {
  settings.disabledTab = e.target.checked;
  Object.values(groups).forEach((g) => g.render());
});

// Number keys 1–3 switch A, Shift+1–3 switch B
const TYPE_KEYS = ["default", "count", "icon"];
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const n = Number(e.code.replace("Digit", ""));
  if (!(n >= 1 && n <= 3)) return;
  const key = e.shiftKey ? "b" : "a";
  document.querySelector(`[data-type-control="${key}"] [data-value="${TYPE_KEYS[n - 1]}"]`).click();
});

// ============================================================
// Motion controls
// ============================================================
const SVG_NS = "http://www.w3.org/2000/svg";
const motionUI = {
  target: "both",
  get groups() { return this.target === "both" ? Object.values(groups) : [groups[this.target]]; },
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

// ---- Easing popover ----
const popover = document.getElementById("easing-popover");
const trigger = document.querySelector("[data-easing-trigger]");
const listEl = document.querySelector("[data-easing-list]");
const optionEls = new Map();

for (const groupName of [...new Set(EASINGS.map((e) => e.group))]) {
  const title = document.createElement("div");
  title.className = "easing-group-title";
  title.textContent = groupName;
  const grid = document.createElement("div");
  grid.className = "easing-grid";
  for (const e of EASINGS.filter((x) => x.group === groupName)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "easing-option";
    btn.role = "radio";
    btn.dataset.id = e.id;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", 28); svg.setAttribute("height", 24);
    svg.setAttribute("viewBox", "0 0 28 24");
    svg.setAttribute("aria-hidden", "true");
    svg.style.overflow = "visible";
    curveSVG(svg, e, 28, 24);
    const name = document.createElement("span");
    name.textContent = e.name;
    btn.append(svg, name);
    btn.addEventListener("click", () => {
      setMotion({ easingId: e.id });
      syncMotionUI();
      replay();
      showPreview(e);
    });
    btn.addEventListener("mouseenter", () => showPreview(e));
    btn.addEventListener("focus", () => showPreview(e));
    btn.addEventListener("mouseleave", () => showPreview(currentEasing()));
    grid.append(btn);
    optionEls.set(e.id, btn);
  }
  listEl.append(title, grid);
}

const previewGraph = document.querySelector("[data-preview-graph]");
const previewDot = document.querySelector("[data-preview-dot]");
let previewEasing = null;
let previewRaf = 0;

function currentEasing() {
  return EASINGS.find((e) => e.id === motionUI.current.easingId);
}

function showPreview(e) {
  previewEasing = e;
  document.querySelector("[data-preview-name]").textContent = e.name;
  document.querySelector("[data-preview-value]").textContent = easingCSS(e);
  document.querySelector("[data-preview-value]").title = easingCSS(e);
  const { Y } = curveSVG(previewGraph, e, 200, 200, { strokeWidth: 2, grid: true });
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("r", 5);
  dot.setAttribute("fill", "var(--text-default)");
  dot.setAttribute("cx", 200);
  dot.setAttribute("cy", Y(1));
  previewGraph.append(dot);
  previewGraph._dot = dot;
  previewGraph._Y = Y;
  playPreview();
}

let previewLoop = 0;
function playPreview() {
  cancelAnimationFrame(previewRaf);
  clearTimeout(previewLoop);
  const e = previewEasing;
  const f = easingFn(e);
  const dur = motionUI.current.duration;
  const trackW = previewDot.parentElement.clientWidth - 24;
  const start = performance.now();
  const frame = (now) => {
    const x = Math.min(1, (now - start) / dur);
    const y = f(x);
    previewDot.style.transform = `translateX(${y * trackW}px)`;
    if (previewGraph._dot) {
      previewGraph._dot.setAttribute("cx", x * 200);
      previewGraph._dot.setAttribute("cy", previewGraph._Y(y));
    }
    if (x < 1) previewRaf = requestAnimationFrame(frame);
    else if (!popover.hidden) previewLoop = setTimeout(playPreview, 700); // loop while the picker is open
  };
  previewRaf = requestAnimationFrame(frame);
}

function setPopover(open) {
  popover.hidden = !open;
  trigger.setAttribute("aria-expanded", String(open));
  if (open) {
    showPreview(currentEasing());
    optionEls.get(motionUI.current.easingId)?.focus({ preventScroll: true });
  }
}
trigger.addEventListener("click", () => setPopover(popover.hidden));
document.addEventListener("pointerdown", (e) => {
  if (!popover.hidden && !popover.contains(e.target) && !trigger.contains(e.target)) setPopover(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !popover.hidden) { setPopover(false); trigger.focus(); }
});
document.querySelector("[data-copy]").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(easingCSS(previewEasing));
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
  optionEls.forEach((el, id) => el.setAttribute("aria-checked", String(id === m.easingId)));
  // Easing/duration don't matter with no animation
  trigger.disabled = durationInput.disabled = m.mode === "none";
  trigger.style.opacity = durationInput.parentElement.style.opacity = m.mode === "none" ? 0.4 : "";
}
syncMotionUI();

// R replays (outside text inputs)
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey && e.target.tagName !== "INPUT") replay();
});
