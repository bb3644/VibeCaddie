import { cookies } from "next/headers";
import { getPlayerProfile } from "@/lib/db/players";

/** 从 cookie 获取当前用户 ID */
export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

/** 获取完整 session 对象（含用户名，用于 player notes 等需要署名的场景） */
export async function getRequiredSession(): Promise<{ user: { id: string; name: string } }> {
  const userId = await getUserId();
  const profile = await getPlayerProfile(userId);
  return { user: { id: userId, name: profile?.name ?? "Golfer" } };
}
