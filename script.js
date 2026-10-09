// Comparison page — three directions side by side

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

