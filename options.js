const DEFAULT_CONDITIONS = () => [
  {
    id: generateId(),
    name: "Local dev",
    patterns: [".localhost", ".local"],
    prefix: "🟢 ",
    enabled: true,
  },
];

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const $conditions = document.getElementById("conditions");
const $addCondition = document.getElementById("add-condition");
const $status = document.getElementById("status");
const $empty = document.getElementById("empty");
const conditionTpl = document.getElementById("condition-template");
const patternTpl = document.getElementById("pattern-template");

let state = { conditions: [] };
let saveTimer = null;
let statusTimer = null;

function load() {
  chrome.storage.sync.get("conditions").then(({ conditions }) => {
    state.conditions =
      Array.isArray(conditions) && conditions.length
        ? conditions
        : DEFAULT_CONDITIONS();
    render();
  });
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    chrome.storage.sync
      .set({ conditions: state.conditions })
      .then(() => flashStatus("Enregistré"));
  }, 200);
}

function flashStatus(msg) {
  $status.textContent = msg;
  $status.style.opacity = "1";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    $status.style.opacity = "0";
  }, 1500);
}

function render() {
  $conditions.innerHTML = "";
  for (const cond of state.conditions) {
    $conditions.appendChild(renderCondition(cond));
  }
  $empty.hidden = state.conditions.length > 0;
}

function renderCondition(cond) {
  const node = conditionTpl.content.firstElementChild.cloneNode(true);
  node.dataset.id = cond.id;

  const $enabled = node.querySelector(".condition-enabled");
  const $name = node.querySelector(".condition-name");
  const $prefix = node.querySelector(".condition-prefix");
  const $patterns = node.querySelector(".patterns");
  const $addPattern = node.querySelector(".add-pattern");
  const $delete = node.querySelector(".delete-condition");

  $enabled.checked = cond.enabled !== false;
  $name.value = cond.name || "";
  $prefix.value = cond.prefix || "";

  cond.patterns = Array.isArray(cond.patterns) ? cond.patterns : [];
  for (const p of cond.patterns) {
    $patterns.appendChild(renderPattern(cond, $patterns, p, false));
  }

  $enabled.addEventListener("change", () => {
    cond.enabled = $enabled.checked;
    save();
  });
  $name.addEventListener("input", () => {
    cond.name = $name.value;
    save();
  });
  $prefix.addEventListener("input", () => {
    cond.prefix = $prefix.value;
    save();
  });
  $addPattern.addEventListener("click", () => {
    cond.patterns.push("");
    $patterns.appendChild(renderPattern(cond, $patterns, "", true));
    save();
  });
  $delete.addEventListener("click", () => {
    state.conditions = state.conditions.filter((c) => c.id !== cond.id);
    render();
    save();
  });

  return node;
}

function renderPattern(cond, listEl, value, focus) {
  const node = patternTpl.content.firstElementChild.cloneNode(true);
  const $input = node.querySelector(".pattern-value");
  const $delete = node.querySelector(".delete-pattern");

  $input.value = value;
  if (focus) queueMicrotask(() => $input.focus());

  const currentIndex = () => [...listEl.children].indexOf(node);

  $input.addEventListener("input", () => {
    const idx = currentIndex();
    if (idx >= 0) {
      cond.patterns[idx] = $input.value;
      save();
    }
  });
  $delete.addEventListener("click", () => {
    const idx = currentIndex();
    if (idx >= 0) {
      cond.patterns.splice(idx, 1);
      node.remove();
      save();
    }
  });

  return node;
}

$addCondition.addEventListener("click", () => {
  const cond = {
    id: generateId(),
    name: "",
    patterns: [""],
    prefix: "",
    enabled: true,
  };
  state.conditions.push(cond);
  $conditions.appendChild(renderCondition(cond));
  $empty.hidden = true;
  save();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.conditions) return;
  // Avoid reloading if the change came from us (simple heuristic: compare JSON)
  const incoming = JSON.stringify(changes.conditions.newValue || []);
  const local = JSON.stringify(state.conditions);
  if (incoming === local) return;
  state.conditions = Array.isArray(changes.conditions.newValue)
    ? changes.conditions.newValue
    : [];
  render();
});

load();
