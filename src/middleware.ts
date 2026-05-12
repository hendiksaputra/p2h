import { type NextRequest, NextResponse } from "next/server";
import { P2H_SESSION_COOKIE, verifySessionToken } from "@/lib/auth-jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(P2H_SESSION_COOKIE)?.value;

  let loggedIn = false;
  if (token) {
    const session = await verifySessionToken(token);
    loggedIn = session !== null;
  }

  if (pathname.startsWith("/login")) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!loggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
