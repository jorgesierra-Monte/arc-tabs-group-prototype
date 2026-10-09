// In situ — Client profile. One tab group, switchable between directions A/B/C.

const PROFILE_TABS = [
  { id: "overview",     label: "Overview" },
  { id: "intersession", label: "Intersession care" },
  { id: "treatment",    label: "Treatment" },
  { id: "forms",        label: "Forms and files" },
];

const views = [...document.querySelectorAll("[data-view]")];
function showView(tab, group) {
  for (const v of views) {
    const on = v.dataset.view === tab.id;
    v.hidden = !on;
    if (on) v.setAttribute("aria-labelledby", `${group.groupId}-tab-${tab.id}`);
  }
}

const groups = {
  main: new TabGroup(document.querySelector(".client-tabs"), {
    direction: "a",
    id: "profile",
    tabs: PROFILE_TABS,
    selectedId: "treatment",
    disabledId: null,
    label: "Client sections",
    onSelect: showView,
  }),
};

// Direction switch (A / B / C)
const dirControl = document.querySelector("[data-direction-control]");
const dirButtons = [...dirControl.querySelectorAll("button")];
function setDirection(key) {
  groups.main.setDirection(key);
  dirButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.value === key)));
}
dirButtons.forEach((b) => b.addEventListener("click", () => setDirection(b.dataset.value)));
dirControl.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  e.preventDefault();
  const i = dirButtons.findIndex((b) => b.getAttribute("aria-checked") === "true");
  const next = dirButtons[(i + (e.key === "ArrowRight" ? 1 : dirButtons.length - 1)) % dirButtons.length];
  next.click();
  next.focus();
});
setDirection("a");

// Divider under the tabs
document.querySelector('[data-toggle="divider"]').addEventListener("change", (e) => {
  settings.divider = e.target.checked;
  groups.main.render();
});

// Keys 1–3 switch direction
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === "INPUT") return;
  const key = { Digit1: "a", Digit2: "b", Digit3: "c" }[e.code];
  if (key) setDirection(key);
});
