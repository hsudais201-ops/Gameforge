import { json, readCookie, sha256, clearSessionCookie, requestAllowed } from "../../lib/auth.js";
export async function onRequestPost({ request, env }) {
  if (!requestAllowed(request)) return json({ error: "Request origin not allowed." }, 403);
  const token = readCookie(request, "__Host-gameforge_session");
  if (token && /^[a-f0-9]{64}$/.test(token)) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}