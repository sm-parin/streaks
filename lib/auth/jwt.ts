import { SignJWT, jwtVerify } from "jose";

const getSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export interface SessionPayload {
  sub: string;
  username: string;
  type: "session" | "password_reset";
}

export async function signToken(
  payload: Omit<SessionPayload, "type"> & { type?: "session" | "password_reset" },
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT({ ...payload, type: payload.type ?? "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
