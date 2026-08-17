import { cookies } from "next/headers";

export async function getSharedSession() {
  const cookieStore = cookies();
  const secureCookie = cookieStore.get("__Secure-next-auth.session-token")?.value;
  const normalCookie = cookieStore.get("next-auth.session-token")?.value;
  const rawToken = secureCookie || normalCookie;
  const cookieName = secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  if (!rawToken) return null;

  try {
    const res = await fetch("https://www.ogzsystem.com/api/auth/session", {
      headers: { cookie: `${cookieName}=${rawToken}` },
      cache: "no-store",
    });
    const session = await res.json();
    if (session && Object.keys(session).length > 0) {
      return session;
    }
  } catch (error) {
    console.error("Shared session fetch error:", error);
    return null;
  }
  
  return null;
}
