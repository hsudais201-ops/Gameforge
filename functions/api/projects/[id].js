import { json, getSessionUser, requestAllowed } from "../../lib/auth.js";

export async function onRequestDelete({ request, env, params }) {
  if (!requestAllowed(request)) return json({ error: "Request origin not allowed." }, 403);
  const user = await getSessionUser(request, env.DB);
  if (!user) return json({ error: "Sign in to delete cloud projects." }, 401);
  const id = String(params.id || "");
  if (!id || id.length > 80) return json({ error: "Invalid project ID." }, 400);
  const result = await env.DB.prepare("DELETE FROM projects WHERE user_id = ? AND project_id = ?").bind(user.id, id).run();
  return json({ ok: true, deleted: Boolean(result.meta?.changes) });
}
