import { json, getSessionUser, requestAllowed, rateLimit } from "../../lib/auth.js";

const MAX_PROJECT_BYTES = 1024 * 1024;
const MAX_PROJECTS_PER_USER = 200;

function validProject(project) {
  if (!project || typeof project !== "object" || Array.isArray(project)) return false;
  if (typeof project.id !== "string" || project.id.length > 80) return false;
  if (typeof project.name !== "string" || !project.name.trim() || project.name.length > 48) return false;
  if (typeof project.genre !== "string" || project.genre.length > 40) return false;
  if (!Array.isArray(project.scenes) || project.scenes.length > 100) return false;
  for (const scene of project.scenes) {
    if (!scene || typeof scene.id !== "string" || typeof scene.name !== "string" || !Array.isArray(scene.objects) || scene.objects.length > 2000) return false;
    for (const object of scene.objects) {
      if (!object || typeof object.id !== "string" || typeof object.kind !== "string" || typeof object.name !== "string") return false;
      if (!["Player", "Platform", "Coin", "Enemy"].includes(object.kind)) return false;
      if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) return false;
    }
  }
  return true;
}

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return json({ error: "Sign in to access cloud projects." }, 401);
  const rows = await env.DB.prepare("SELECT project_id, project_json, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?")
    .bind(user.id, MAX_PROJECTS_PER_USER).all();
  const projects = (rows.results || []).flatMap(row => {
    try { return [JSON.parse(row.project_json)]; } catch { return []; }
  });
  return json({ projects });
}

export async function onRequestPost({ request, env }) {
  if (!requestAllowed(request)) return json({ error: "Request origin not allowed." }, 403);
  const user = await getSessionUser(request, env.DB);
  if (!user) return json({ error: "Sign in to save cloud projects." }, 401);
  if (!(await rateLimit(env.DB, "projects:" + user.id, 120, 3600))) return json({ error: "Cloud save limit reached. Try again later." }, 429);
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_PROJECT_BYTES) return json({ error: "Project is too large. Maximum size is 1 MB." }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_PROJECT_BYTES) return json({ error: "Project is too large. Maximum size is 1 MB." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "Please send valid JSON." }, 400); }
  const project = body?.project;
  if (!validProject(project)) return json({ error: "Project data is invalid or contains unsupported objects." }, 400);
  const serialized = JSON.stringify(project);
  const now = Math.floor(Date.now() / 1000);
  const existing = await env.DB.prepare("SELECT created_at FROM projects WHERE user_id = ? AND project_id = ?").bind(user.id, project.id).first();
  if (!existing) {
    const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM projects WHERE user_id = ?").bind(user.id).first();
    if ((count?.count || 0) >= MAX_PROJECTS_PER_USER) return json({ error: "You have reached the 200 cloud project limit." }, 409);
  }
  await env.DB.prepare("INSERT INTO projects (project_id, user_id, name, genre, project_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, project_id) DO UPDATE SET name = excluded.name, genre = excluded.genre, project_json = excluded.project_json, updated_at = excluded.updated_at")
    .bind(project.id, user.id, project.name.trim(), project.genre, serialized, existing?.created_at || now, now).run();
  return json({ ok: true, projectId: project.id, updatedAt: now });
}
