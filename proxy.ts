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

  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: cookieName,
  });

  if (!token) {
    const loginUrl = new URL("https://ogzsystem.com/admin/login");
    const hasCookie = request.cookies.has(cookieName);
    loginUrl.searchParams.set("callbackUrl", `https://ald.ogzsystem.com${pathname}`);
    loginUrl.searchParams.set("debug_hasCookie", String(hasCookie));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
