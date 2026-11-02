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
let runtimeFrame = 0;
let runtimeState = null;
let runtimeKeys = {};
let runtimeScore = 0;
let runtimeLastTime = 0;
let runtimeCameraX = 0;\nlet runtimeWorldWidth = 0;
let runtimeInitialState = null;
let runtimeLives = 3;
let runtimeInvulnerableUntil = 0;
let runtimeGameOver = false;

function stopPlaytest() {
  playing = false;
  if (runtimeFrame) cancelAnimationFrame(runtimeFrame);
  runtimeFrame = 0;
  runtimeState = null;
  runtimeInitialState = null;
  runtimeGameOver = false;
  runtimeKeys = {};
  document.getElementById("play-btn").textContent = "▶ Playtest";
  document.getElementById("viewport-mode").textContent = "EDIT MODE";
  document.getElementById("viewport").classList.remove("playing");
  document.getElementById("runtime-hud")?.remove();
  const scene = document.getElementById("scene-objects");
  scene.style.width = "";
  scene.style.transform = "";
  renderEditor();
}

function startPlaytest() {
  const project = currentProject();
  if (!project) return;
  const viewport = document.getElementById("viewport");
  const player = project.objects.find(object => object.kind === "Player" && object.visible !== false);
  if (!player) {
    addObject("Player");
    return startPlaytest();
  }

  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  runtimeScore = 0;
  runtimeState = project.objects.filter(object => object.visible !== false).map(object => {
    const element = document.querySelector('.scene-object[data-id="' + object.id + '"]');
    return {
      ...object,
      px: object.x / 100 * width,
      py: object.y / 100 * height,
      w: element?.offsetWidth || 36,
      h: element?.offsetHeight || 36,
      vx: 0,
      vy: 0,
      grounded: false,
      alive: true
    };
  });
  runtimeState.playerId = player.id;
  runtimeInitialState = runtimeState.map(object => ({...object}));
  runtimeLives = 3;
  runtimeInvulnerableUntil = 0;
  runtimeGameOver = false;
  runtimeLastTime = 0;
  runtimeCameraX = 0;
  runtimeWorldWidth = Math.max(width * 2.5, ...project.objects.map(object => object.x / 100 * width + width * 0.5));
  runtimeKeys = {};
  playing = true;
  document.getElementById("play-btn").textContent = "■ Stop";
  document.getElementById("viewport-mode").textContent = "PLAYTEST MODE";
  viewport.classList.add("playing");

  const hud = document.createElement("div");
  hud.id = "runtime-hud";
  hud.innerHTML = '<strong id="runtime-score">SCORE&nbsp; 0</strong><strong id="runtime-lives">LIVES  3</strong><span class="runtime-hint">A/D or arrows · Space to jump</span><div class="runtime-touch"><button data-key="ArrowLeft">◀</button><button data-key="ArrowRight">▶</button><button data-key="Space">JUMP</button><button id="runtime-restart">RESTART</button></div>';
  hud.querySelector("#runtime-restart").addEventListener("click", restartPlaytest);
  hud.querySelectorAll("[data-key]").forEach(button => {
    const key = button.dataset.key;
    button.addEventListener("pointerdown", event => { event.preventDefault(); runtimeKeys[key] = true; });
    ["pointerup","pointercancel","pointerleave"].forEach(type => button.addEventListener(type, () => { runtimeKeys[key] = false; }));
  });
  viewport.appendChild(hud);

  runtimeFrame = requestAnimationFrame(runPlaytestFrame);
}

function restartPlaytest() {
  if (!runtimeInitialState) return;
  runtimeState = runtimeInitialState.map(object => ({...object}));
  runtimeScore = 0;
  runtimeLives = 3;
  runtimeInvulnerableUntil = 0;
  runtimeGameOver = false;
  runtimeLastTime = 0;
  document.getElementById("runtime-score").textContent = "SCORE  0";
  document.getElementById("runtime-lives").textContent = "LIVES  3";
  document.getElementById("runtime-game-over")?.remove();
  runtimeFrame = requestAnimationFrame(runPlaytestFrame);
}

function endPlaytestGame() {
  if (runtimeGameOver) return;
  runtimeGameOver = true;
  runtimeKeys = {};
  const overlay = document.createElement("div");
  overlay.id = "runtime-game-over";
  overlay.innerHTML = '<strong>GAME OVER</strong><span>Try again when you are ready.</span><button id="runtime-try-again">PLAY AGAIN</button>';
  overlay.querySelector("button").addEventListener("click", restartPlaytest);
  document.getElementById("viewport").appendChild(overlay);
}

function runtimeRect(object) {
  return { left: object.px, right: object.px + object.w, top: object.py, bottom: object.py + object.h };
}
function runtimeOverlap(a, b) {
  const x = runtimeRect(a), y = runtimeRect(b);
  return x.left < y.right && x.right > y.left && x.top < y.bottom && x.bottom > y.top;
}
function runPlaytestFrame(timestamp) {
  if (!playing || !runtimeState || runtimeGameOver) return;
  const viewport = document.getElementById("viewport");
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const dt = runtimeLastTime ? Math.min((timestamp - runtimeLastTime) / 1000, 0.032) : 0;
  runtimeLastTime = timestamp;
  const player = runtimeState.find(object => object.id === runtimeState.playerId);
  if (!player) return stopPlaytest();

  const left = runtimeKeys.ArrowLeft || runtimeKeys.a;
  const right = runtimeKeys.ArrowRight || runtimeKeys.d;
  const jump = runtimeKeys.Space || runtimeKeys.ArrowUp || runtimeKeys.w;
  player.vx = (right ? 220 : 0) - (left ? 220 : 0);
  if (jump && player.grounded) {
    player.vy = -490;
    player.grounded = false;
  }
  player.vy = Math.min(player.vy + 1250 * dt, 850);
  player.px = Math.max(0, Math.min(runtimeWorldWidth - player.w, player.px + player.vx * dt));
  const oldBottom = player.py + player.h;
  player.py += player.vy * dt;
  player.grounded = false;

  const floorTop = height * 0.75;
  if (player.py + player.h >= floorTop && oldBottom <= floorTop + 12 && player.vy >= 0) {
    player.py = floorTop - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  for (const platform of runtimeState.filter(object => object.kind === "Platform" && object.alive)) {
    const crossedTop = oldBottom <= platform.py + 8 && player.py + player.h >= platform.py;
    const horizontal = player.px < platform.px + platform.w && player.px + player.w > platform.px;
    if (crossedTop && horizontal && player.vy >= 0) {
      player.py = platform.py - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  for (const object of runtimeState) {
    if (!object.alive || object.id === player.id) continue;
    if (object.kind === "Coin" && runtimeOverlap(player, object)) {
      object.alive = false;
      runtimeScore += 1;
      document.getElementById("runtime-score").textContent = "SCORE  " + runtimeScore;
    } else if (object.kind === "Enemy" && runtimeOverlap(player, object) && timestamp >= runtimeInvulnerableUntil) {
      runtimeLives -= 1;
      runtimeInvulnerableUntil = timestamp + 1100;
      player.px = Math.max(0, Math.min(runtimeWorldWidth - player.w, player.px - 65));
      player.vy = -260;
      document.getElementById("runtime-lives").textContent = "LIVES  " + runtimeLives;
      if (runtimeLives <= 0) { endPlaytestGame(); return; }
    }
  }
  if (player.py > height + 100) {
    runtimeLives -= 1;
    document.getElementById("runtime-lives").textContent = "LIVES  " + runtimeLives;
    if (runtimeLives <= 0) { endPlaytestGame(); return; }
    player.px = 45;
    player.py = height * 0.35;
    player.vx = 0;
    player.vy = 0;
    runtimeInvulnerableUntil = timestamp + 1100;
  }

  const targetCameraX = Math.max(0, Math.min(runtimeWorldWidth - width, player.px - width * 0.42));
  runtimeCameraX += (targetCameraX - runtimeCameraX) * Math.min(1, dt * 8);
  const scene = document.getElementById("scene-objects");
  for (const object of runtimeState) {
    let element = scene.querySelector('[data-id="' + object.id + '"]');
    if (!object.alive) { element?.remove(); continue; }
    if (element) {
      element.style.left = object.px + "px";
      element.style.top = object.py + "px";
      element.classList.remove("selected");
    }
  }
  scene.style.width = runtimeWorldWidth + "px";
  scene.style.transform = "translateX(" + (-runtimeCameraX) + "px)";
  document.getElementById("runtime-hud").dataset.world = Math.round(runtimeCameraX) + " / " + Math.round(runtimeWorldWidth);
  runtimeFrame = requestAnimationFrame(runPlaytestFrame);
}

window.addEventListener("keydown", event => {
  if (!playing) return;
  if (["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(event.code)) event.preventDefault();
  runtimeKeys[event.code] = true;
  runtimeKeys[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", event => {
  runtimeKeys[event.code] = false;
  runtimeKeys[event.key.toLowerCase()] = false;
});
window.addEventListener("blur", () => { runtimeKeys = {}; });

document.getElementById("play-btn").addEventListener("click", () => {
  if (playing) stopPlaytest();
  else startPlaytest();
});
document.getElementById("export-btn").addEventListener("click", () => {
  const project = currentProject(); if (!project) return;
  const blob = new Blob([JSON.stringify({ format: "gameforge-scene", version: 1, project }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".gameforge.json"; a.click(); URL.revokeObjectURL(url);
});
document.getElementById("export-html-btn").addEventListener("click", () => {
  const project = currentProject();
  if (!project) return;
  const gameData = {
    name: project.name,
    objects: project.objects.filter(object => object.visible !== false).map(object => ({
      kind: object.kind, name: object.name, x: object.x, y: object.y
    }))
  };
  const safeData = JSON.stringify(gameData).replace(/</g, "\\u003c");
  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + escapeHtml(project.name) + '</title><style>*{box-sizing:border-box}body{margin:0;background:#101510;color:#f4f7f2;font:16px system-ui;display:grid;place-items:center;min-height:100vh}main{width:min(960px,96vw)}header{display:flex;justify-content:space-between;padding:10px 2px}canvas{display:block;width:100%;background:linear-gradient(#182b27 0 75%,#263d2a 75%);border:1px solid #47624c;border-radius:12px;touch-action:none}button{background:#a5f34d;border:0;border-radius:9px;padding:12px 18px;font-weight:800}small{color:#a9b5a6}</style></head>',
    '<body><main><header><b id="title"></b><span id="score">SCORE 0</span></header><canvas id="game" width="900" height="500"></canvas><p><small>Move: A/D or arrows · Jump: Space / W / ↑</small></p><button id="restart">Restart</button></main><script>',
    'const GAME=' + safeData + ';const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");document.getElementById("title").textContent=GAME.name;',
    'const keys={};let score=0,player,things,last=0,frame=0;',
    'function reset(){score=0;document.getElementById("score").textContent="SCORE 0";player={x:70,y:250,w:30,h:42,vx:0,vy:0,ground:false};things=GAME.objects.filter(o=>o.kind!=="Player").map(o=>({...o,x:o.x/100*canvas.width,y:o.y/100*canvas.height,alive:true}));cancelAnimationFrame(frame);last=0;frame=requestAnimationFrame(loop)}',
    'function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}',
    'function loop(t){let dt=last?Math.min((t-last)/1000,.032):0;last=t;player.vx=(keys.right?220:0)-(keys.left?220:0);if(keys.jump&&player.ground){player.vy=-490;player.ground=false}player.vy=Math.min(player.vy+1250*dt,850);player.x=Math.max(0,Math.min(canvas.width-player.w,player.x+player.vx*dt));let old=player.y+player.h;player.y+=player.vy*dt;player.ground=false;let floor=canvas.height*.75;if(player.y+player.h>=floor&&old<=floor+12&&player.vy>=0){player.y=floor-player.h;player.vy=0;player.ground=true}for(const o of things){if(!o.alive)continue;let b={x:o.x,y:o.y,w:o.kind==="Platform"?110:30,h:o.kind==="Platform"?16:30};if(o.kind==="Platform"&&old<=b.y+8&&player.y+player.h>=b.y&&player.x<b.x+b.w&&player.x+player.w>b.x&&player.vy>=0){player.y=b.y-player.h;player.vy=0;player.ground=true}if(hit(player,b)){if(o.kind==="Coin"){o.alive=false;score++;document.getElementById("score").textContent="SCORE "+score}else if(o.kind==="Enemy"){player.x=Math.max(0,player.x-45);player.vx=0}}}ctx.clearRect(0,0,900,500);ctx.fillStyle="#263d2a";ctx.fillRect(0,floor,900,500);for(const o of things){if(!o.alive)continue;ctx.fillStyle=o.kind==="Platform"?"#87c85a":o.kind==="Coin"?"#f5d34c":"#dc6673";ctx.fillRect(o.x,o.y,o.kind==="Platform"?110:30,o.kind==="Platform"?16:30)}ctx.fillStyle="#a5f34d";ctx.fillRect(player.x,player.y,player.w,player.h);frame=requestAnimationFrame(loop)}',
    'window.addEventListener("keydown",e=>{let k=e.key.toLowerCase();if(["arrowleft","arrowright","arrowup"," "].includes(k))e.preventDefault();if(k==="a"||k==="arrowleft")keys.left=true;if(k==="d"||k==="arrowright")keys.right=true;if(k==="w"||k==="arrowup"||k===" ")keys.jump=true});window.addEventListener("keyup",e=>{let k=e.key.toLowerCase();if(k==="a"||k==="arrowleft")keys.left=false;if(k==="d"||k==="arrowright")keys.right=false;if(k==="w"||k==="arrowup"||k===" ")keys.jump=false});document.getElementById("restart").onclick=reset;reset();',
    '</script></body></html>'
  ].join("\\n");
  const blob = new Blob([html], {type:"text/html"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

renderProjects("project-grid");
