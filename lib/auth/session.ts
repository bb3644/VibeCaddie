import { getServerSession } from "next-auth";
import { authOptions } from "./config";

/** 获取已认证的 session，未登录则抛出错误 */
export async function getRequiredSession() {
  // TODO: 恢复 auth guard（临时关闭用于预览）
  if (process.env.SKIP_AUTH === "true") {
    return { user: { id: "preview-user", name: "Preview User", email: "preview@example.com" } };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** 获取当前登录用户的 ID */
export async function getUserId(): Promise<string> {
  const session = await getRequiredSession();
  return session.user.id;
}
