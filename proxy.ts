import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API auth rotaları ile usta formları hariç her şeyi koru
  const isPublicPath =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/u/");

  if (isPublicPath) return NextResponse.next();

  const secureCookieValue = request.cookies.get("__Secure-next-auth.session-token")?.value;
  const normalCookieValue = request.cookies.get("next-auth.session-token")?.value;
  const rawToken = secureCookieValue || normalCookieValue;
  const cookieName = secureCookieValue ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  let isAuthenticated = false;

  if (rawToken) {
    try {
      // Direct API verification to bypass all encryption/decryption issues
      const res = await fetch("https://www.ogzsystem.com/api/auth/session", {
        headers: {
          cookie: `${cookieName}=${rawToken}`,
        },
        cache: "no-store"
      });
      const session = await res.json();
      if (session && Object.keys(session).length > 0) {
        isAuthenticated = true;
      }
    } catch (error) {
      console.error("Session fetch error:", error);
    }
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("https://ogzsystem.com/admin/login");
    loginUrl.searchParams.set("callbackUrl", `https://ald.ogzsystem.com${pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
