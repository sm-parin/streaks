import { cookies } from "next/headers";
import { verifyToken, type SessionPayload } from "./jwt";

export const COOKIE_NAME = "streaks_session";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload || payload.type !== "session") return null;
    return payload;
  } catch {
    return null;
  }
}
