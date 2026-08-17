import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API auth rotaları ile usta formları hariç her şeyi koru
  const isPublicPath =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/u/");

  if (isPublicPath) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
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
