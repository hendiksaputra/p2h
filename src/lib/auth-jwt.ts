import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "./auth-secret";

export const P2H_SESSION_COOKIE = "p2h_session";

export type SessionJwtPayload = {
  sub: string;
  username: string;
  fullname: string;
};

export async function createSessionToken(user: {
  id: string;
  username: string;
  fullname: string;
}): Promise<string> {
  const secret = getAuthSecret();
  return new SignJWT({
    username: user.username,
    fullname: user.fullname,
  })
    .setSubject(user.id)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const sub = payload.sub;
    const username = typeof payload.username === "string" ? payload.username : "";
    const fullname = typeof payload.fullname === "string" ? payload.fullname : "";
    if (!sub) return null;
    return { sub, username, fullname };
  } catch {
    return null;
  }
}
