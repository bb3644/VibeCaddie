import { cookies } from "next/headers";

/** 从 cookie 获取当前用户 ID */
export async function getUserId(): Promise<string> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
