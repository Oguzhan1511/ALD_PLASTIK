import { getSharedSession } from "@/lib/session";

/**
 * Tüm server action'ların başında çağrılır.
 * Geçerli bir oturum yoksa Error fırlatır — bu otomatik olarak client'a 500 döndürür
 * ve action'ın geri kalanı hiç çalışmaz.
 */
export async function requireAuth(): Promise<void> {
  const session = await getSharedSession();
  if (!session) {
    throw new Error("Bu işlemi gerçekleştirmek için giriş yapmanız gerekmektedir.");
  }
}
