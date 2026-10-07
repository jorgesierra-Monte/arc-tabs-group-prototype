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
  { name: "Focus",             selected: false, disabled: false, cls: "is-focus" },
  { name: "Selected",          selected: true,  disabled: false },
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

    this.mount = section.querySelector("[data-tab-group]");
    this.panel = section.querySelector("[data-tab-panel]");
    this.statesEl = section.querySelector("[data-states]");
    this.panel.id = `${this.groupId}-panel`;

    this.mount.classList.add(`dir-${this.key}`);
    this.statesEl.classList.add(`dir-${this.key}`);
    this.render();
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

    this.mount.replaceChildren(list);
    this.list = list;
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
    this.updatePanel();
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
