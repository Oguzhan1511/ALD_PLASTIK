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

  let token = null;
  if (rawToken) {
    try {
      token = await getToken({
        req: request,
        secret: "ogzsystem-ald-plastik-shared-secret-2026-v2",
        raw: false,
      });
      // Fallback manual decode if getToken fails
      if (!token) {
        const { decode } = await import("next-auth/jwt");
        token = await decode({
          token: rawToken,
          secret: "ogzsystem-ald-plastik-shared-secret-2026-v2",
          salt: secureCookieValue ? "__Secure-next-auth.session-token" : "next-auth.session-token",
        });
      }
    } catch (error) {
      console.error("Token decode error:", error);
    }
  }

  if (!token) {
    const loginUrl = new URL("https://ogzsystem.com/admin/login");
    loginUrl.searchParams.set("callbackUrl", `https://ald.ogzsystem.com${pathname}`);
    
    // Safely check if cookies exist
    const c1 = request.cookies.get("__Secure-next-auth.session-token");
    const c2 = request.cookies.get("next-auth.session-token");
    loginUrl.searchParams.set("has_secure_cookie", c1 ? "yes" : "no");
    loginUrl.searchParams.set("has_normal_cookie", c2 ? "yes" : "no");
    
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
