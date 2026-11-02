import { json, randomHex, hashPassword, createSession, sessionCookie, requestAllowed, rateLimit, validEmail, PASSWORD_ITERATIONS } from "../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!requestAllowed(request)) return json({ error: "Request origin not allowed." }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Please send valid JSON." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Please send valid account details." }, 400);
  const email = String(body.email || "").trim().toLowerCase();
  const displayName = String(body.name || "").trim().slice(0, 48);
  const password = typeof body.password === "string" ? body.password : "";
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  if (displayName.length < 2) return json({ error: "Name must contain at least 2 characters." }, 400);
  if (password.length < 10 || password.length > 128) return json({ error: "Password must be 10–128 characters." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!(await rateLimit(env.DB, "register:" + ip, 5, 3600))) return json({ error: "Too many sign-up attempts. Try again later." }, 429);
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
  const userId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  try {
    await env.DB.prepare("INSERT INTO users (id, email, display_name, password_hash, password_salt, password_iterations, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(userId, email, displayName, passwordHash, salt, PASSWORD_ITERATIONS, now, now).run();
  } catch {
    return json({ error: "An account with that email may already exist." }, 409);
  }
  const token = await createSession(env.DB, userId);
  return json({ user: { id: userId, email, name: displayName } }, 201, { "Set-Cookie": sessionCookie(token) });
}
