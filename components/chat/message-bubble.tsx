"use client";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

/** 聊天消息气泡 — 用户右对齐，Caddie 左对齐 */
export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  // 按换行分段渲染
  const lines = content.split("\n");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex flex-col gap-0.5 max-w-[85%]">
        {!isUser && (
          <span className="text-[0.75rem] text-secondary ml-1">
            Vibe Caddie
          </span>
        )}
        <div
          className={`
            rounded-2xl p-3 px-4
            text-[0.9375rem] leading-[1.5rem]
            ${
              isUser
                ? "bg-accent text-white"
                : "bg-card border border-divider text-text"
            }
          `}
        >
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
