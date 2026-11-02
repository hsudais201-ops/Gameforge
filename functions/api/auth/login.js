import { json, hashPassword, createSession, sessionCookie, requestAllowed, rateLimit, validEmail } from "../../lib/auth.js";
export async function onRequestPost({ request, env }) {
  if (!requestAllowed(request)) return json({ error: "Request origin not allowed." }, 403);
  let body; try { body = await request.json(); } catch { return json({ error: "Please send valid JSON." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Please send valid account details." }, 400);
  const email = String(body.email || "").trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!validEmail(email) || !password || password.length > 128) return json({ error: "Email or password is incorrect." }, 401);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!(await rateLimit(env.DB, "login:" + ip + ":" + email, 8, 900))) return json({ error: "Too many login attempts. Try again in 15 minutes." }, 429);
  const user = await env.DB.prepare("SELECT id, email, display_name, password_hash, password_salt, password_iterations FROM users WHERE email = ? COLLATE NOCASE").bind(email).first();
  if (!user) return json({ error: "Email or password is incorrect." }, 401);
  const candidate = await hashPassword(password, user.password_salt, user.password_iterations);
  if (candidate !== user.password_hash) return json({ error: "Email or password is incorrect." }, 401);
  const token = await createSession(env.DB, user.id);
  return json({ user: { id: user.id, email: user.email, name: user.display_name } }, 200, { "Set-Cookie": sessionCookie(token) });
}