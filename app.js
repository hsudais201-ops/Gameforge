const STORAGE_KEY = "gameforge-studio-v1";
const icons = { Player: "🧙", Platform: "", Coin: "💎", Enemy: "👾" };
let state = loadState();
let currentProjectId = state.projects[0]?.id || null;
let selectedId = null;
let playing = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.projects)) return saved;
  } catch {}
  return { projects: [] };
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const status = document.getElementById("save-state");
  if (status) status.textContent = "Saved locally";
}
function currentProject() {
  return state.projects.find(p => p.id === currentProjectId);
}
function showView(name) {
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  document.getElementById(name + "-view").classList.remove("hidden");
  document.getElementById("page-name").textContent = name === "home" ? "Overview" : name === "editor" ? "Scene editor" : "My projects";
  document.querySelectorAll(".nav-item[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === name));
  if (name === "projects") renderProjects("all-project-grid");
  if (name === "editor") renderEditor();
}
function createProject(name, genre) {
  const project = { id: crypto.randomUUID(), name, genre, updated: new Date().toISOString(), objects: [] };
  state.projects.unshift(project);
  currentProjectId = project.id;
  saveState();
  renderProjects("project-grid");
  renderProjects("all-project-grid");
  showView("editor");
}
function renderProjects(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  if (!state.projects.length) {
    target.innerHTML = '<div class="empty-card">No projects yet. Create your first game to get started.</div>';
    return;
  }
  target.innerHTML = state.projects.map(p => '<article class="project-card" data-project="' + p.id + '"><div class="project-art">✧</div><div class="project-info"><b>' + escapeHtml(p.name) + '</b><p>' + escapeHtml(p.genre) + ' · ' + p.objects.length + ' scene objects</p></div></article>').join("");
  target.querySelectorAll("[data-project]").forEach(card => card.addEventListener("click", () => {
    currentProjectId = card.dataset.project; showView("editor");
  }));
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function addObject(kind) {
  const project = currentProject();
  if (!project) return;
  const object = { id: crypto.randomUUID(), name: kind, kind, x: 35 + Math.round(Math.random()*35), y: kind === "Platform" ? 65 : 45, visible: true };
  project.objects.push(object); selectedId = object.id; project.updated = new Date().toISOString();
  saveState(); renderEditor();
}
function renderEditor() {
  const project = currentProject();
  if (!project) { document.getElementById("editor-title").textContent = "No project selected"; return; }
  document.getElementById("editor-title").textContent = project.name;
  const list = document.getElementById("object-list");
  list.innerHTML = project.objects.map(o => '<div class="object-row ' + (o.id === selectedId ? "selected" : "") + '" data-id="' + o.id + '"><span>' + (icons[o.kind] || "◇") + " " + escapeHtml(o.name) + '</span><span>⋮</span></div>').join("") || '<p class="muted">No objects in this scene yet.</p>';
  list.querySelectorAll("[data-id]").forEach(row => row.addEventListener("click", () => { selectedId = row.dataset.id; renderEditor(); }));
  const scene = document.getElementById("scene-objects");
  scene.innerHTML = project.objects.filter(o => o.visible).map(o => '<div class="scene-object ' + (o.id === selectedId ? "selected" : "") + '" data-id="' + o.id + '" data-kind="' + o.kind + '" style="left:' + o.x + '%;top:' + o.y + '%">' + (icons[o.kind] || "◇") + '</div>').join("");
  scene.querySelectorAll("[data-id]").forEach(el => {
    el.addEventListener("pointerdown", event => {
      if (playing) return;
      event.preventDefault();
      selectedId = el.dataset.id;
      const object = project.objects.find(item => item.id === selectedId);
      const startX = event.clientX;
      const startY = event.clientY;
      const initialX = object.x;
      const initialY = object.y;
      const bounds = document.getElementById("viewport").getBoundingClientRect();
      el.setPointerCapture(event.pointerId);
      el.classList.add("selected");
      const move = moveEvent => {
        object.x = Math.max(0, Math.min(95, initialX + (moveEvent.clientX - startX) / bounds.width * 100));
        object.y = Math.max(0, Math.min(90, initialY + (moveEvent.clientY - startY) / bounds.height * 100));
        el.style.left = object.x + "%";
        el.style.top = object.y + "%";
        const xControl = document.getElementById("obj-x");
        const yControl = document.getElementById("obj-y");
        if (xControl) { xControl.value = object.x; xControl.previousElementSibling.querySelector("output").value = Math.round(object.x) + "%"; }
        if (yControl) { yControl.value = object.y; yControl.previousElementSibling.querySelector("output").value = Math.round(object.y) + "%"; }
      };
      const finish = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", finish);
        el.removeEventListener("pointercancel", finish);
        saveState();
        renderEditor();
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", finish);
      el.addEventListener("pointercancel", finish);
      renderInspector();
    });
  });
  document.getElementById("empty-scene").classList.toggle("hidden", project.objects.length > 0);
  renderInspector();
}
function renderInspector() {
  const project = currentProject();
  const obj = project?.objects.find(o => o.id === selectedId);
  const panel = document.getElementById("inspector-content");
  if (!obj) { panel.innerHTML = '<p class="muted">Select an object to edit its properties.</p>'; return; }
  panel.innerHTML = '<div class="field"><label>OBJECT NAME</label><input id="obj-name" value="' + escapeHtml(obj.name) + '"></div>' +
    '<div class="field"><label>HORIZONTAL POSITION <output>' + obj.x + '%</output></label><input id="obj-x" type="range" min="0" max="95" value="' + obj.x + '"></div>' +
    '<div class="field"><label>VERTICAL POSITION <output>' + obj.y + '%</output></label><input id="obj-y" type="range" min="0" max="90" value="' + obj.y + '"></div>' +
    '<div class="field"><label><input id="obj-visible" type="checkbox" ' + (obj.visible ? "checked" : "") + '> Visible in scene</label></div>' +
    '<button class="secondary-btn" id="delete-object">Delete object</button>';
  document.getElementById("obj-name").addEventListener("change", e => { obj.name = e.target.value || obj.kind; saveState(); renderEditor(); });
  ["x","y"].forEach(axis => document.getElementById("obj-" + axis).addEventListener("input", e => {
    obj[axis] = Number(e.target.value);
    e.target.previousElementSibling.querySelector("output").value = obj[axis] + "%";
    const visual = document.querySelector('.scene-object[data-id="' + obj.id + '"]');
    if (visual) visual.style[axis === "x" ? "left" : "top"] = obj[axis] + "%";
    saveState();
  }));
  document.getElementById("obj-visible").addEventListener("change", e => { obj.visible = e.target.checked; saveState(); renderEditor(); });
  document.getElementById("delete-object").addEventListener("click", () => { project.objects = project.objects.filter(o => o.id !== obj.id); selectedId = null; saveState(); renderEditor(); });
}
document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", () => showView(el.dataset.view)));
document.querySelectorAll('[data-action="new-project"]').forEach(el => el.addEventListener("click", () => document.getElementById("project-dialog").showModal()));
document.getElementById("project-form").addEventListener("submit", e => {
  if (e.submitter?.id !== "create-project") return;
  e.preventDefault();
  const name = document.getElementById("project-name").value.trim();
  if (!name) return;
  const genre = document.getElementById("project-type").value;
  document.getElementById("project-dialog").close();
  e.target.reset(); createProject(name, genre);
});
document.querySelectorAll("[data-object]").forEach(el => el.addEventListener("click", () => addObject(el.dataset.object)));
document.getElementById("add-object").addEventListener("click", () => addObject("Player"));
document.getElementById("play-btn").addEventListener("click", () => {
  playing = !playing;
  document.getElementById("play-btn").textContent = playing ? "■ Stop" : "▶ Playtest";
  document.getElementById("viewport-mode").textContent = playing ? "PLAYTEST MODE" : "EDIT MODE";
  document.getElementById("viewport").classList.toggle("playing", playing);
});
document.getElementById("export-btn").addEventListener("click", () => {
  const project = currentProject(); if (!project) return;
  const blob = new Blob([JSON.stringify({ format: "gameforge-scene", version: 1, project }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".gameforge.json"; a.click(); URL.revokeObjectURL(url);
});
renderProjects("project-grid");
