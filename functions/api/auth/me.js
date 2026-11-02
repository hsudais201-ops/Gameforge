import { json, getSessionUser } from "../../lib/auth.js";
export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return json({ user: null });
  return json({ user: { id: user.id, email: user.email, name: user.display_name } });
}