// Arc Tab Group — shared component used by the comparison page and the in-situ pages.
// Directions: A text hover, B surface hover, C inverse selected.

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
  // opts: { direction, id, tabs, selectedId, disabledId, label, onSelect }
  constructor(section, opts = {}) {
    this.section = section;
    this.key = opts.direction || section.dataset.direction;
    this.groupId = opts.id || `group-${this.key}`;
    this.tabs = opts.tabs || TABS;
    this.disabledId = opts.disabledId === undefined ? DISABLED_ID : opts.disabledId;
    this.label = opts.label || `Direction ${this.key.toUpperCase()} tabs`;
    this.onSelect = opts.onSelect || null;
    this.type = "default";
    this.selectedId = opts.selectedId || "notes";
    this.motion = { mode: "slide", easingId: "decelerate", duration: 300 }; // final: Slide + Decelerate

    this.mount = section.querySelector("[data-tab-group]");
    this.panel = section.querySelector("[data-tab-panel]");
    if (this.panel) this.panel.id = `${this.groupId}-panel`;

    this.mount.classList.add(`dir-${this.key}`);
    this.render();

    // Keep the sliding bar glued to its tab when fonts load or the layout reflows
    const relayout = () => { this.placeSlider(false); this.placeInvert(false); };
    new ResizeObserver(relayout).observe(this.mount);
    document.fonts.ready.then(relayout);
  }

  // Swap the visual direction (A/B/C) in place, keeping the selection
  setDirection(key) {
    this.mount.classList.remove(`dir-${this.key}`);
    this.key = key;
    this.mount.classList.add(`dir-${key}`);
    this.render();
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
    // Slide + Stretch share the travelling bar
    list.classList.toggle("motion-slide", mode === "slide" || mode === "stretch");
    list.classList.toggle("motion-stretch", mode === "stretch");
    list.style.setProperty("--motion-dur", `${duration}ms`);
    list.style.setProperty("--motion-ease", easingCSS(easing));
    this.placeSlider(false);
    this.placeInvert(false);
    list.offsetWidth; // flush so the mode switch itself doesn't animate
    list.classList.remove("no-transition");
  }

  // Selected tab's indicator slot, relative to the tablist. Uses layout offsets,
  // not getBoundingClientRect, so a mid-animation transform can't skew it.
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
    return settings.disabledTab && this.disabledId != null && id === this.disabledId;
  }

  setType(type) {
    this.type = type;
    this.render();
  }

  render() {
    const hadFocus = this.mount.contains(document.activeElement);
    if (this.isDisabled(this.selectedId)) this.selectedId = this.tabs[0].id;

    const list = document.createElement("div");
    list.className = "tablist" + (settings.divider ? " has-divider" : "") +
      (settings.hoverLine && this.key === "a" ? " hover-line" : ""); // A only
    list.role = "tablist";
    list.setAttribute("aria-label", this.label);

    for (const tab of this.tabs) {
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
    const enabled = this.tabs.filter((t) => !this.isDisabled(t.id));
    const i = enabled.findIndex((t) => t.id === this.selectedId);
    this.select(enabled[(i + 1) % enabled.length].id);
  }

  onKeydown(e) {
    const enabled = this.tabs.filter((t) => !this.isDisabled(t.id));
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
    const tab = this.tabs.find((t) => t.id === this.selectedId);
    if (this.panel) {
      this.panel.setAttribute("aria-labelledby", `${this.groupId}-tab-${tab.id}`);
      this.panel.innerHTML = `<strong>${tab.label}</strong><br>${tab.blurb}`;
    }
    if (this.onSelect) this.onSelect(tab, this);
  }


}

